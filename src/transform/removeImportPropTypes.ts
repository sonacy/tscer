import { isImportDeclaration, isStringLiteral, SourceFile, updateSourceFileNode } from "typescript"

export const removeImportPropTypes = () => () => (sourceFile: SourceFile) => {
  const statements = sourceFile.statements.filter(s => !(isImportDeclaration(s) && isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === 'prop-types'))
  return updateSourceFileNode(sourceFile, statements)
}