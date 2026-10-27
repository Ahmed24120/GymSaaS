import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.tsx')) continue;
    const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(tree);
        if (['button', 'a', 'Link'].includes(tag)) {
          const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
          const attr = (name) => attributes.find((a) => a.name.getText(tree) === name);
          const location = tree.getLineAndCharacterOfPosition(node.getStart(tree));
          let status = 'dynamic href — manual review';
          if (tag === 'button') {
            let parent = node.parent;
            let form = false;
            while (parent) {
              if (ts.isJsxElement(parent) && parent.openingElement.tagName.getText(tree) === 'form') {
                form = parent.openingElement.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText(tree) === 'onSubmit');
                break;
              }
              parent = parent.parent;
            }
            status = attr('onClick') ? 'handler declared' : form ? 'form submit handler' : attr('disabled') ? 'disabled or conditional — manual review' : 'NO HANDLER';
          } else if (!attr('href')) status = 'NO HREF';
          else if (attr('href').initializer && ts.isStringLiteral(attr('href').initializer)) status = `href: ${attr('href').initializer.text}`;
          entries.push({ file: path.relative(web, file).replaceAll('\\', '/'), line: location.line + 1, tag, status });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
}
walk(path.join(web, 'src'));
const report = ['# Static action inventory', '', 'A declared handler is not proof of a working action. Authenticated actions were not executed.', '', '| File | Line | Element | Static result |', '|---|---|---|---|',
  ...entries.map((r) => `| ${r.file} | ${r.line} | ${r.tag} | ${r.status} |`)];
writeFileSync(path.join(web, 'tests/evidence/actions.md'), report.join('\n'), 'utf8');
console.log(`Inventoried ${entries.length} action elements. Missing handler/href: ${entries.filter((r) => r.status.startsWith('NO ')).length}. Dynamic links require manual review.`);
