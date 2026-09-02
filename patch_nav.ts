import * as fs from 'fs';
let content = fs.readFileSync('src/components/Navigation.tsx', 'utf-8');

content = content.replace(
  /<button\s+onClick=\{\(\) => handleSelect\('AUDIT'\)\}[\s\S]*?<ShieldAlert[\s\S]*?<span className="flex-1">Auditoria Imutável<\/span>\s+<\/button>/,
  `{isAdmin && (
      <button
        onClick={() => handleSelect('AUDIT')}
        className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left \${
          isCurrent('AUDIT', 'AUDITORIA')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }\`}
      >
        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">Auditoria Imutável</span>
      </button>
      )}`
);

fs.writeFileSync('src/components/Navigation.tsx', content);
