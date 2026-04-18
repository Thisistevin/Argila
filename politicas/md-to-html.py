#!/usr/bin/env python3
"""Converte um arquivo Markdown em HTML estilizado (saída para stdout).
Uso: python3 md-to-html.py arquivo.md > arquivo.html
"""
import sys
import markdown

CSS = """
@page { size: A4; margin: 22mm 18mm 22mm 18mm; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
  color: #1f2230;
  font-size: 10.5pt;
  line-height: 1.55;
  max-width: 170mm;
}
h1 {
  font-size: 22pt;
  color: #3a2a7c;
  border-bottom: 2px solid #6d4cff;
  padding-bottom: 8px;
  margin: 0 0 16px;
}
h2 {
  font-size: 14pt;
  color: #3a2a7c;
  margin-top: 22px;
  margin-bottom: 8px;
  page-break-after: avoid;
}
h3 {
  font-size: 11.5pt;
  color: #3a2a7c;
  margin-top: 16px;
  margin-bottom: 6px;
  page-break-after: avoid;
}
p { margin: 0 0 8px; }
ul, ol { margin: 0 0 10px 20px; padding: 0; }
li { margin-bottom: 4px; }
strong { color: #14112a; }
hr { border: none; border-top: 1px solid #d7d4ea; margin: 18px 0; }
table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  font-size: 9.5pt;
}
th, td {
  border: 1px solid #d7d4ea;
  padding: 6px 8px;
  vertical-align: top;
  text-align: left;
}
th { background: #ece8ff; color: #3a2a7c; }
code {
  font-family: 'SF Mono', Menlo, monospace;
  background: #f3f1fb;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 9.5pt;
}
pre {
  background: #f3f1fb;
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 9pt;
}
a { color: #6d4cff; text-decoration: none; }
"""


def main() -> None:
    if len(sys.argv) != 2:
        print("Uso: md-to-html.py arquivo.md", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], encoding="utf-8") as fp:
        text = fp.read()
    body = markdown.markdown(text, extensions=["tables", "sane_lists"])
    print(
        "<!doctype html><html lang=\"pt-br\"><head>"
        "<meta charset=\"utf-8\">"
        f"<style>{CSS}</style>"
        "</head><body>" + body + "</body></html>"
    )


if __name__ == "__main__":
    main()
