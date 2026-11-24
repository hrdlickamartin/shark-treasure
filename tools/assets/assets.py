import argparse
import colorsys
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MANIFEST = os.path.join(ROOT, 'tools', 'assets', 'manifest.json')
STYLE_REFERENCE = os.path.join(ROOT, 'tools', 'assets', 'style-reference.png')
SPRITES_DIR = os.path.join(ROOT, 'assets', 'sprites')
BACKGROUNDS_DIR = os.path.join(ROOT, 'assets', 'backgrounds')
SPRITE_ASSETS_TS = os.path.join(ROOT, 'src', 'render', 'spriteAssets.ts')
RIGS_TS = os.path.join(ROOT, 'src', 'render', 'rigs.ts')
MEDIA_SCRIPT = os.path.expanduser('~/.claude/skills/generate-media/scripts/media.mjs')
ALPHA_THRESHOLD = 12
SOLID_ALPHA = 120
EDGE_KEEP = 9
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
    for name in sorted(n for n in manifest['sprites'] if os.path.exists(sprite_path(n))):
        lines.append(f"  {name}: {{ source: require('../../assets/sprites/{name}.png'), aspect: {aspect_of(name)} }},")
    lines += ['} as const;', '', 'export type SpriteName = keyof typeof SPRITES;', '', 'export const BACKGROUNDS = {']
    for name in [n for n in manifest['backgrounds'] if os.path.exists(os.path.join(BACKGROUNDS_DIR, f'{n}.jpg'))]:
        lines.append(f"  {name}: require('../../assets/backgrounds/{name}.jpg'),")
    lines += ['} as const;', '', 'export type BackgroundName = keyof typeof BACKGROUNDS;', '', 'export const ILLUSTRATIONS = {']
    for name in [n for n in manifest.get('illustrations', {}) if os.path.exists(os.path.join(BACKGROUNDS_DIR, f'{n}.jpg'))]:
        lines.append(f"  {name}: require('../../assets/backgrounds/{name}.jpg'),")
    lines.append('} as const;')
    return '\n'.join(lines) + '\n'


def render_rigs(manifest):
    lines = [
        "import type { SpriteName } from './spriteAssets';",
        '',
        'export interface RigDef {',
        '  cuts: number[];',
        '  pivots: number[];',
        '}',
        '',
        'export const RIGS: Partial<Record<SpriteName, RigDef>> = {',
    ]
    for name in sorted(n for n in manifest['sprites'] if os.path.exists(sprite_path(n))):
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


CUT_MAX_RATIO = 0.15


def is_creature(name, entry):
    return bool(entry.get('facing')) or name.endswith('_q')


def side_cut(im):
    alpha = im.getchannel('A')
    w, h = im.size
    column = lambda x: sum(1 for y in range(h) if alpha.getpixel((x, y)) > 100)
    return max(column(0), column(w - 1)) / h


def touches_edge(im):
    alpha = im.getchannel('A')
    w, h = im.size
    box = alpha.point(lambda v: 255 if v > 100 else 0).getbbox()
    if not box:
        return False
    rows = sum(1 for y in range(h) if alpha.getpixel((0, y)) > 100 or alpha.getpixel((w - 1, y)) > 100)
    cols = sum(1 for x in range(w) if alpha.getpixel((x, 0)) > 100 or alpha.getpixel((x, h - 1)) > 100)
    return rows > h * 0.05 or cols > w * 0.05


def cmd_check(_args):
    manifest = load_manifest()
    errors = []
    files = {f[:-4] for f in os.listdir(SPRITES_DIR) if f.endswith('.png')}
    names = set(manifest['sprites'])
    for name in sorted(names - files):
        errors.append(f'{name}: je v manifestu, ale chybí assets/sprites/{name}.png')
    for name in sorted(files - names):
        errors.append(f'assets/sprites/{name}.png: chybí v tools/assets/manifest.json')
    for name in [*manifest['backgrounds'], *manifest.get('illustrations', {})]:
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
            if is_creature(name, entry):
                cut = side_cut(Image.open(sprite_path(name)).convert('RGBA'))
                if cut > CUT_MAX_RATIO:
                    errors.append(f'{name}: tvor je useknutý okrajem obrázku ({cut:.0%} výšky na boku), vygeneruj ho znovu')
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
    if is_creature(name, entry) and touches_edge(im):
        print(f'⚠ {name}: tvor sahá až k okraji vstupního obrázku, nejspíš je useknutý – zkontroluj ho a případně generuj znovu')
    alpha = im.getchannel('A')
    if is_creature(name, entry):
        near = alpha.point(lambda v: 255 if v > SOLID_ALPHA else 0).filter(ImageFilter.MaxFilter(EDGE_KEEP))
        im.putalpha(ImageChops.darker(alpha, near))
        im = im.crop(near.getbbox())
    else:
        im = im.crop(alpha.point(lambda v: 255 if v > ALPHA_THRESHOLD else 0).getbbox())
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    size = entry.get('maxSize', 400)
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(sprite_path(name), optimize=True)
    print(f'Uloženo assets/sprites/{name}.png ({im.width}×{im.height})')


def derive_sprite(name, entry):
    source = entry['derive']['from']
    hue = entry['derive']['hue']
    im = Image.open(sprite_path(source)).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.52 <= h <= 0.75 and s_ > 0.25 and v < 0.62:
                nr, ng, nb = colorsys.hsv_to_rgb(hue, min(1, s_ * 1.1), min(1, v * 1.25))
                px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    im.save(sprite_path(name), optimize=True)


def cmd_derive(args):
    manifest = load_manifest()
    for name, entry in sorted(manifest['sprites'].items()):
        if 'derive' in entry and (args.force or not os.path.exists(sprite_path(name))):
            derive_sprite(name, entry)
            print(f'Odvozeno assets/sprites/{name}.png z {entry["derive"]["from"]}')
    cmd_build(args)


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
        + ' The whole creature or object must fit inside the canvas with a clear empty margin on every side – nothing touching or cut off by the edges, especially the snout, head, jaws and tail.'
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
    p_derive = sub.add_parser('derive', help='vytvoří barevné varianty spritů podle pole derive v manifestu')
    p_derive.add_argument('--force', action='store_true')
    p_derive.set_defaults(func=cmd_derive)
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
