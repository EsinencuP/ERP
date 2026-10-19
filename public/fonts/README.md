# Локальные шрифты PDF

Источник: [Geist в Google Fonts](https://github.com/google/fonts/tree/main/ofl/geist), версия 1.800. Лицензия OFL сохранена в OFL-Geist.txt.

Geist.ttf — исходный variable TTF. Geist-Regular.ttf — статический экземпляр с wght=400, кириллицей и знаком рубля для @react-pdf/renderer v4. На сервере используется только статический файл; загрузки шрифтов из сети нет. FontTools нужен только для воспроизведения преобразования, не для запуска приложения:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
font = TTFont("public/fonts/Geist.ttf")
instantiateVariableFont(font, {"wght": 400}, inplace=False).save("public/fonts/Geist-Regular.ttf")
```
