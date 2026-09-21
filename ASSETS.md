# Optional assets / Дополнительные материалы

The repository includes an original practice study and screenshots of that study. It does not redistribute downloaded arrangements, sound banks, or character artwork.

В репозитории есть собственный учебный этюд и скриншоты с ним. Скачанные аранжировки, банки сэмплов и изображения персонажей не публикуются.

Local installations may add the following files, all excluded from Git:

| Path | Purpose |
| --- | --- |
| `public/songs/catalog.json` | Optional local catalogue; same schema as `catalog.example.json` |
| `public/songs/*.mid` | Your own MIDI files |
| `public/instruments/{name}.json` | Sample banks keyed by note name, e.g. `C4`, with base64 MP3 data URLs. Names follow `src/features/practice/instrument-names.json`. |
| `public/characters/miku.vrm` | Optional compatible VRM model |
| `public/characters/miku-{emotion}.png` | Optional 2D atlases: 8 columns, 6 rows, 192×256 pixels per frame; neutral, happy, wink, surprised, sad |

Only add assets you have permission to use. A public download does not itself grant redistribution rights. The character integration is experimental and expects a specific rig and facial morph layout; arbitrary VRM files are not guaranteed to work. The code's MIT license does not license Hatsune Miku or any third-party model.

Добавляйте только материалы, на использование которых у вас есть разрешение. Доступность скачивания не означает разрешение на повторную публикацию. Экспериментальная поддержка персонажа рассчитана на определённый скелет и набор выражений лица, а не на любые VRM-файлы. Лицензия MIT на код не распространяется на Мику или стороннюю модель.

Icons: [Lucide](https://lucide.dev/license) (ISC) and [Material Design Icons](https://pictogrammers.com/docs/general/license/) (Apache-2.0). Other dependencies carry their licenses in their installed packages.
