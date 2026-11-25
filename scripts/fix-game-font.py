"""Локальная OFL-производная Pixelify Sans; для сборки нужен FontTools.

О повторяет латинскую O. П использует контур п с высотой заглавных,
включая начертания 400–700. Остальные буквы остаются исходными.
"""
from copy import deepcopy
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib.instancer import instantiateVariableFont

assets = Path(__file__).resolve().parents[1] / 'public/assets/sphere-game'
font = TTFont(assets / 'PixelifySans.ttf')
font.ensureDecompiled()
masters = []
advances = []
for weight in (400, 700):
    instance = instantiateVariableFont(font, {'wght': weight}, inplace=False)
    glyph = deepcopy(instance['glyf']['uni043F'])
    cap = max(y for _, y in instance['glyf']['uni041D'].coordinates)
    rise = cap - max(y for _, y in glyph.coordinates)
    glyph.coordinates = type(glyph.coordinates)((x, y + rise if y > 0 else y) for x, y in glyph.coordinates)
    masters.append(glyph)
    advances.append(instance['hmtx']['uni043F'][0])

name = 'uni041F'
font.setGlyphOrder([*font.getGlyphOrder(), name])
font['glyf'][name] = masters[0]
font['hmtx'][name] = font['hmtx']['uni043F']
delta = [(bx - ax, by - ay) for (ax, ay), (bx, by) in zip(masters[0].coordinates, masters[1].coordinates)]
font['gvar'].variations[name] = [TupleVariation({'wght': (0, 1, 1)}, delta + [(0, 0), (advances[1] - advances[0], 0), (0, 0), (0, 0)])]
font['HVAR'].table.AdvWidthMap.mapping[name] = font['HVAR'].table.AdvWidthMap.mapping['uni043F']
for table in font['cmap'].tables:
    if table.isUnicode():
        table.cmap[0x041E] = 'O'
        table.cmap[0x041F] = name
for record in list(font['name'].names):
    replacement = {1: 'Saving Pixel', 4: 'Saving Pixel Regular', 6: 'SavingPixel-Regular', 16: 'Saving Pixel'}.get(record.nameID)
    if replacement:
        font['name'].setName(replacement, record.nameID, record.platformID, record.platEncID, record.langID)
output = assets / 'SavingPixel.ttf'
font.save(output)

result = TTFont(output)
assert all(code in result.getBestCmap() for code in [*range(0x410, 0x450), 0x401, 0x451])
for weight in (400, 500, 600, 700):
    instance = instantiateVariableFont(result, {'wght': weight}, inplace=False)
    cap = max(y for _, y in instance['glyf']['uni041D'].coordinates)
    assert max(y for _, y in instance['glyf'][name].coordinates) == cap
print(f'{output.name}: вся русская кириллица, высота П проверена при 400/500/600/700')
