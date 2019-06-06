import {
  addSyntheticTrailingComment,
  isFunctionDeclaration,
  Node,
  ParameterDeclaration,
  SourceFile,
  SyntaxKind,
  TransformationContext,
  TypeChecker,
  updateFunctionDeclaration,
  visitEachChild,
} from 'typescript'

export const parseTsFunc = (typeChecker: TypeChecker) => (
  context: TransformationContext
) => (sourceFile: SourceFile) => {
  const visitor = (node: Node) => {
    if (isFunctionDeclaration(node)) {
      const type = typeChecker.getTypeAtLocation(node)

      const nodeType = typeChecker.typeToTypeNode(type) as any
      const parameters = nodeType.parameters.map((p: ParameterDeclaration) => {
        return addSyntheticTrailingComment(
          p,
          SyntaxKind.SingleLineCommentTrivia,
          ' TODO:',
          true
        )
      })
      return updateFunctionDeclaration(
        node,
        node.decorators,
        node.modifiers,
        node.asteriskToken,
        node.name,
        node.typeParameters,
        parameters,
        node.type,
        node.body
      )
    }

    return node
  }

  return visitEachChild(sourceFile, visitor, context)
}
