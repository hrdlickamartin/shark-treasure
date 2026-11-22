import argparse
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MANIFEST = os.path.join(ROOT, 'tools', 'assets', 'manifest.json')
STYLE_REFERENCE = os.path.join(ROOT, 'tools', 'assets', 'style-reference.png')
SPRITES_DIR = os.path.join(ROOT, 'assets', 'sprites')
BACKGROUNDS_DIR = os.path.join(ROOT, 'assets', 'backgrounds')
SPRITE_ASSETS_TS = os.path.join(ROOT, 'src', 'render', 'spriteAssets.ts')
RIGS_TS = os.path.join(ROOT, 'src', 'render', 'rigs.ts')
MEDIA_SCRIPT = os.path.expanduser('~/.claude/skills/generate-media/scripts/media.mjs')
ALPHA_THRESHOLD = 12
FACING_MIN_RATIO = 1.15


def load_manifest():
    with open(MANIFEST, encoding='utf-8') as f:
        return json.load(f)


def sprite_path(name):
    return os.path.join(SPRITES_DIR, f'{name}.png')


def aspect_of(name):
    with Image.open(sprite_path(name)) as im:
        return round(im.width / im.height, 4)


def render_sprite_assets(manifest):
    lines = ['export const SPRITES = {']
    for name in sorted(manifest['sprites']):
        lines.append(f"  {name}: {{ source: require('../../assets/sprites/{name}.png'), aspect: {aspect_of(name)} }},")
    lines += ['} as const;', '', 'export type SpriteName = keyof typeof SPRITES;', '', 'export const BACKGROUNDS = [']
    for name in manifest['backgrounds']:
        lines.append(f"  require('../../assets/backgrounds/{name}.jpg'),")
    lines.append('] as const;')
    return '\n'.join(lines) + '\n'


def render_rigs(manifest):
    lines = [
        "import type { SpriteName } from './spriteAssets';",
        '',
        'export interface RigDef {',
        '  cuts: [number, number];',
        '  pivots: [number, number];',
        '}',
        '',
        'export const RIGS: Partial<Record<SpriteName, RigDef>> = {',
    ]
    for name in sorted(manifest['sprites']):
        rig = manifest['sprites'][name].get('rig')
        if rig:
            cuts = ', '.join(str(v) for v in rig['cuts'])
            pivots = ', '.join(str(v) for v in rig['pivots'])
            lines.append(f'  {name}: {{ cuts: [{cuts}], pivots: [{pivots}] }},')
    lines.append('};')
    return '\n'.join(lines) + '\n'


def facing_ratio(name):
    with Image.open(sprite_path(name)) as im:
        alpha = im.getchannel('A')
        w, h = alpha.size
        px = alpha.load()
        third = w // 3
        left = sum(1 for x in range(third) for y in range(0, h, 2) if px[x, y] > 40)
        right = sum(1 for x in range(w - third, w) for y in range(0, h, 2) if px[x, y] > 40)
    return right / max(1, left)


def cmd_build(_args):
    manifest = load_manifest()
    with open(SPRITE_ASSETS_TS, 'w', encoding='utf-8') as f:
        f.write(render_sprite_assets(manifest))
    with open(RIGS_TS, 'w', encoding='utf-8') as f:
        f.write(render_rigs(manifest))
    print(f'Vygenerováno: {os.path.relpath(SPRITE_ASSETS_TS, ROOT)}, {os.path.relpath(RIGS_TS, ROOT)}')


def cmd_check(_args):
    manifest = load_manifest()
    errors = []
    files = {f[:-4] for f in os.listdir(SPRITES_DIR) if f.endswith('.png')}
    names = set(manifest['sprites'])
    for name in sorted(names - files):
        errors.append(f'{name}: je v manifestu, ale chybí assets/sprites/{name}.png')
    for name in sorted(files - names):
        errors.append(f'assets/sprites/{name}.png: chybí v tools/assets/manifest.json')
    for name in manifest['backgrounds']:
        if not os.path.exists(os.path.join(BACKGROUNDS_DIR, f'{name}.jpg')):
            errors.append(f'{name}: chybí assets/backgrounds/{name}.jpg')
    if not errors:
        for path, expected in ((SPRITE_ASSETS_TS, render_sprite_assets(manifest)), (RIGS_TS, render_rigs(manifest))):
            with open(path, encoding='utf-8') as f:
                if f.read() != expected:
                    errors.append(f'{os.path.relpath(path, ROOT)} neodpovídá manifestu, spusť npm run assets:build')
        for name, entry in sorted(manifest['sprites'].items()):
            if entry.get('facingCheck') and entry.get('facing') == 'right':
                ratio = facing_ratio(name)
                if ratio < FACING_MIN_RATIO:
                    errors.append(f'{name}: sprite nejspíš nekouká doprava (poměr hmoty vpravo/vlevo {ratio:.2f}), oprav přes import --flip')
    for e in errors:
        print(f'✗ {e}')
    if errors:
        sys.exit(1)
    print(f'✓ Assety v pořádku ({len(names)} spritů)')


def import_image(name, source, flip, manifest):
    entry = manifest['sprites'].get(name)
    if entry is None:
        sys.exit(f'{name} není v manifestu, nejdřív ho přidej do tools/assets/manifest.json')
    im = Image.open(source).convert('RGBA')
    mask = im.getchannel('A').point(lambda v: 255 if v > ALPHA_THRESHOLD else 0)
    im = im.crop(mask.getbbox())
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    size = entry.get('maxSize', 400)
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(sprite_path(name), optimize=True)
    print(f'Uloženo assets/sprites/{name}.png ({im.width}×{im.height})')


def cmd_import(args):
    manifest = load_manifest()
    import_image(args.name, args.source, args.flip, manifest)
    cmd_build(args)


def cmd_generate(args):
    manifest = load_manifest()
    entry = manifest['sprites'].get(args.name)
    if entry is None:
        sys.exit(f'{args.name} není v manifestu')
    refs = [STYLE_REFERENCE] + [sprite_path(r) for r in entry.get('references', [])]
    prompt = (
        'Using the attached art direction sheet as the style reference'
        + (' and the other attached sprites as the exact design reference' if entry.get('references') else '')
        + f", create ONE single isolated game sprite: {entry['prompt']}. {manifest['style']}"
    )
    out = os.path.join(tempfile.mkdtemp(prefix='shark-asset-'), f'{args.name}.png')
    command = ['node', MEDIA_SCRIPT, 'openai-image', '--model', 'gpt-image-1.5', '--background', 'transparent', '--quality', 'medium', '--size', args.size, '--prompt', prompt, '--out', out]
    for ref in refs:
        command += ['--image', ref]
    print(f'Generuji {args.name} (gpt-image-1.5, cca 0,05 $)…')
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
    import_image(args.name, out, args.flip, manifest)
    cmd_build(args)
    print(f'Surový výstup: {out}')


def main():
    parser = argparse.ArgumentParser(description='Pipeline assetů Shark Treasure: manifest → assets/sprites → src/render/spriteAssets.ts a rigs.ts')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('build', help='vygeneruje spriteAssets.ts a rigs.ts z manifestu').set_defaults(func=cmd_build)
    sub.add_parser('check', help='ověří soulad manifestu, souborů, generovaného kódu a směr pohledu').set_defaults(func=cmd_check)
    p_import = sub.add_parser('import', help='ořízne a zmenší obrázek do assets/sprites a přegeneruje kód')
    p_import.add_argument('name')
    p_import.add_argument('source')
    p_import.add_argument('--flip', action='store_true', help='zrcadlově otočí obrázek (sprite musí koukat doprava)')
    p_import.set_defaults(func=cmd_import)
    p_generate = sub.add_parser('generate', help='vygeneruje sprite přes generate-media podle promptu z manifestu (placené)')
    p_generate.add_argument('name')
    p_generate.add_argument('--size', default='1024x1024')
    p_generate.add_argument('--flip', action='store_true')
    p_generate.set_defaults(func=cmd_generate)
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
