# Ресурсы игрового интерфейса

- `ground-snow.png` — актуальный фон по просьбе пользователя от 25 ноября 2026. Создан ImageGen, исходник `exec-47f5b3e1-95bf-4863-b9b3-aac4d2f4c824.png`. Промпт: бесшовный пиксельный зимний двор под снегом, вид строго сверху, мягкие следы каменных плит и льда, холодная сине-серая палитра #718b9f–#c0d4df, без зелени, объектов, персонажей и текста. Средняя светлота сохраняет читаемость белого снеговичка. Предыдущая зелёная ground.png сохранена, но больше не используется.

- `snowman.webp` — копия существующего авторского атласа `assets/snowman/pixel/final/spritesheet-extended.webp`. Ячейка 192×208, 8 столбцов; используются покой и ходьба в обе стороны. Исходник не изменялся.
- `PixelifySans.ttf` — Pixelify Sans, официальный репозиторий Google Fonts: https://github.com/google/fonts/tree/main/ofl/pixelifysans. SIL Open Font License 1.1 сохранена в `OFL.txt`. Проверено наличие кириллицы, включая Ё/ё.
- `ground.png` — создан встроенным ImageGen 25 ноября 2026. Исходник: `exec-8271c228-7c9b-429f-8a08-4464238c7dad.png`. Промпт: бесшовная тёмно-зелёная текстура замшелого каменного двора, вид сверху, 16-битный пиксельный стиль, низкий контраст, без персонажей, текста и интерфейса. Используется как повторяемый фон игрового поля.
- `items.png` — создан встроенным ImageGen 25 ноября 2026. Исходник: `exec-0493f4eb-f3d8-451a-a4b0-a00d6e80539d.png`. Промпт: прозрачный пиксельный атлас 4×4; по строкам — щит, звезда, магнит, молния; сердце, ботинки, синий кристалл, монета; призрак, летучая мышь, скелет, жнец; факел, надгробие, дерево, сундук. Изображение 1261×1247, кадры берутся по нормализованной сетке 4×4 с прозрачными полями; кадры проверены в интерфейсе. Игровой предмет или враг использует один кадр, исходное изображение не обрезалось.

Референс интерфейса: Vampire Survivors, https://store.steampowered.com/app/1794680/Vampire_Survivors/. Для структуры меню усилений просмотрены скриншоты https://dengekionline.com/articles/129674/ и https://crudzoo.com/blog/vampire/. Ресурсы оригинальной игры не копировались: используются собственные спрайты, сгенерированные ресурсы и свободный шрифт.

## Музыка и эффекты — 25 ноября 2026

- `audio/frost-battle.mp3`: оригинальная инструментальная генерация ElevenLabs Music v2.5 через Higgsfield, job `4d9bf356-cf44-4e3b-910e-bb45b3cc9a77`. Длительность 96 секунд. Это генерация для прототипа, не запись саундтрека Vampire Survivors и не CC0-библиотека.
- Направление промпта: снежная готическая аркада, эпическая минорная мелодия, органные арпеджио, быстрые струнные, рок-ударные, бас и ретро FM-синтезатор; без вокала и встроенных игровых эффектов. Запрошены 150 BPM, D minor и музыкальный разворот для повторения; точные BPM/тональность результата отдельно не измерялись.
- Исходный MP3: https://d8j0ntlcm91z4.cloudfront.net/user_3Gqxj4uSwccUdXuxZp2D7D0UtGB/hf_20261125_132240_4d9bf356-cf44-4e3b-910e-bb45b3cc9a77.mp3
- Обработка существующим ffmpeg: `loudnorm=I=-18:TP=-2:LRA=8,afade=t=in:d=0.06,afade=t=out:st=95.6:d=0.4`; MP3 160 kbps, 44.1 kHz stereo. Измеренный sample peak после кодирования −6,8 dBFS, средний уровень −20,6 dBFS. Повтор через HTMLAudio.loop; бесшовность музыкальной фразы не подтверждена прослушиванием.
- Эффекты синтезируются локально Web Audio в `src/sphere-game/audio.js`: залп, исчезновение врага, цепная молния, искра, урон, повышение уровня, выбор способности, босс, победа и поражение. Внешних семплов и новых зависимостей нет.

## Непрерывный музыкальный цикл — 25 ноября 2026

- Активный файл игры теперь `audio/frost-battle-loop.mp3`; прежний `frost-battle.mp3` сохранён как источник обработки. Его затухающий конец содержал 1,462857 секунды тишины ниже −42 dBFS, несмотря на включённый HTMLAudio.loop.
- Новый цикл: основной фрагмент 2–90 с, затем двухсекундное наложение хвоста 90–92 с на начало 0–2 с с кривыми qsin. После наложения повтор возвращается к отметке 2 с исходника. Финальное затухание и тишина исключены. MP3 160 kbps / 44,1 kHz stereo, длительность цикла около 90 секунд.
- Проверка декодированием трёх повторов (270,05 с): silencedetect при −42 dBFS / 150 мс не обнаружил тишины; sample peak −6,3 dBFS. Непрерывность сигнала проверена; музыкальная бесшовность по такту и звучание на устройстве пользователя отдельно не оценивались.

## Исправление кириллицы — 25 ноября 2026

- Активная гарнитура `SavingPixel.ttf` — локальная производная Pixelify Sans, переименованная в Saving Pixel. Исходник и OFL.txt сохранены. В исходном Pixelify Sans обнаружены отсутствующие U+041E (О) и U+041F (П); официальный Google Fonts и авторский файл совпали с ним по SHA-256.
- Для О использован существующий контур латинской O. П построена из контура строчной п: верхняя перекладина поднята до высоты заглавной Н, сохранены ширина штрихов и вариации веса 400–700. Остальные глифы исходные. Текст интерфейса остаётся кириллическим, латинской подмены в строках нет.
- Воспроизводимая сборка: `scripts/fix-game-font.py` (инструмент FontTools, не зависимость приложения). После сборки скрипт проверяет весь русский алфавит и высоту П при 400/500/600/700. Дополнительный Node-тест проверяет обе Unicode-таблицы cmap готового файла.

## Щит Т-Банка — 25 ноября 2026

- `t-shield.png` — пиксельная адаптация жёлтого щита с тёмной Т по запросу пользователя. Создан ImageGen; исходник `exec-7a1778fe-6138-4c68-890e-30eb93b9e0a5.png`, прозрачный PNG 1254×1254. Геометрический референс — существующий логотип лендинга `a0f38bfae26eb8da.svg`. Используется для способности «Орбитальный щит» в выборе, инвентаре и на орбите. Остальной атлас сохранён.
- Точный промпт:

> Create ONE finished pixel-art equipment sprite for the game Saving Survivors: the recognizable yellow T-Bank shield logo with the dark Cyrillic/Latin capital T emblem inside, adapted into a retro 16-bit survival-game shield pickup. Front view, symmetrical, broad flat horizontal top, straight sides that step inward toward a centered pointed bottom. Bright brand yellow #FFDD2D face, a restrained one-pixel amber lower/right bevel and a dark navy pixel outline for legibility on snow. The central DARK CHARCOAL T must be large, unmistakable and readable at 28px: wide horizontal top bar, strong vertical stem, slightly flared foot, the recognizable T-Bank monogram. No letters beyond this T. Think a clean native 32x32 pixel sprite with integer stair-step edges and uniform pixels, no smooth curves, no anti-aliasing, no gradients, no glow, no perspective or 3D tilt. Shield occupies about 80% of the square, centered with even transparent padding. TRUE transparent background, no checkerboard, no text labels, no backdrop, no floor shadow, no extra objects, no sprite sheet. Match restrained hand-drawn pixel RPG inventory icons. Geometry reference: original yellow shield goes from top corners (0,3),(29,3), down to y17.6, then inward via (23.8,26.65),(14.5,32),(5.2,26.65); original T top bar spans x8..21 at y11..14.4 and central stem x12.4..16.6 reaches y23, with small flared foot x11.5..17.5. Keep this familiar silhouette and emblem.
