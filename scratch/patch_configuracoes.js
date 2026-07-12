const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/_authenticated/configuracoes.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace the loading state
const loadingBlockPattern = `  if (isLoadingOrg || isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-xs gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        Carregando configurações de gerenciamento...
      </div>
    );
  }`;

if (content.includes(loadingBlockPattern)) {
  content = content.replace(loadingBlockPattern, '  const isLoading = isLoadingOrg || isLoadingSettings;');
  console.log('Replaced loading block.');
} else {
  console.error('Could not find exact loading block pattern!');
  // Let's try a regex for the loading block in case formatting differs slightly
  const regex = /if\s*\(\s*isLoadingOrg\s*\|\|\s*isLoadingSettings\s*\)\s*\{[^]*?return\s*\(\s*<div[\s\S]*?<\/div>\s*\);\s*\}/;
  if (regex.test(content)) {
    content = content.replace(regex, '  const isLoading = isLoadingOrg || isLoadingSettings;');
    console.log('Replaced loading block via regex.');
  } else {
    console.error('Regex for loading block also failed!');
  }
}

// 2. Update the H1 element to include loading indicator
content = content.replace(
  `<h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Configurações do Sistema
          </h1>`,
  `<h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Configurações do Sistema
            {isLoading && (
              <span className="text-slate-400 text-xs font-normal animate-pulse flex items-center gap-1.5 ml-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                Carregando dados...
              </span>
            )}
          </h1>`
);

// 3. Update the main save button
content = content.replace(
  `        <Button
          onClick={() => saveAllSettings.mutate()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
          disabled={saveAllSettings.isPending}
        >`,
  `        <Button
          onClick={() => saveAllSettings.mutate()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
          disabled={saveAllSettings.isPending || isLoading}
        >`
);

// 4. Disable all Inputs, Switches, Textareas, Selects
content = content.replace(/<Input\b([^>]*)/g, (match, body) => {
  if (body.includes('disabled=')) return match;
  return `<Input disabled={isLoading || saveAllSettings.isPending}` + body;
});

content = content.replace(/<Switch\b([^>]*)/g, (match, body) => {
  if (body.includes('disabled=')) return match;
  return `<Switch disabled={isLoading || saveAllSettings.isPending}` + body;
});

content = content.replace(/<Textarea\b([^>]*)/g, (match, body) => {
  if (body.includes('disabled=')) return match;
  return `<Textarea disabled={isLoading || saveAllSettings.isPending}` + body;
});

content = content.replace(/<Select\b([^>]*)/g, (match, body) => {
  if (body.includes('disabled=')) return match;
  return `<Select disabled={isLoading || saveAllSettings.isPending}` + body;
});

// 5. Update other buttons in Tab 2 (Export & Delete)
content = content.replace(
  `                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleGdpExport}
                    className="flex items-center gap-1 text-slate-700"
                  >`,
  `                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleGdpExport}
                    className="flex items-center gap-1 text-slate-700"
                    disabled={isLoading}
                  >`
);

content = content.replace(
  `                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleSimulateDeletion}
                    className="flex items-center gap-1 text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                  >`,
  `                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleSimulateDeletion}
                    className="flex items-center gap-1 text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                    disabled={isLoading}
                  >`
);

// 6. Update Test SMTP connection button
content = content.replace(
  `                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleTestSmtp}
                        className="flex items-center gap-1.5"
                        disabled={testingSmtp}
                      >`,
  `                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleTestSmtp}
                        className="flex items-center gap-1.5"
                        disabled={testingSmtp || isLoading}
                      >`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully.');
