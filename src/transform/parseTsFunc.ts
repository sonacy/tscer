import {
  addSyntheticTrailingComment,
  isArrowFunction,
  isFunctionDeclaration,
  isVariableStatement,
  Node,
  NodeBuilderFlags,
  ParameterDeclaration,
  SourceFile,
  SyntaxKind,
  TransformationContext,
  TypeChecker,
  updateFunctionDeclaration,
  updateVariableDeclaration,
  updateVariableDeclarationList,
  updateVariableStatement,
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

    if (
      isVariableStatement(node) &&
      node.declarationList &&
      node.declarationList.declarations
    ) {
      const exp = node.declarationList.declarations[0]
      if (exp.initializer && isArrowFunction(exp.initializer)) {
        const aFunc = exp.initializer
        const type = typeChecker.getTypeAtLocation(exp)

        const nodeType = typeChecker.typeToTypeNode(
          type,
          undefined,
          NodeBuilderFlags.NoTruncation
        ) as any

        const newVD = updateVariableDeclaration(exp, exp.name, nodeType, aFunc)

        const newDList = updateVariableDeclarationList(node.declarationList, [
          newVD,
        ])
        return updateVariableStatement(node, node.modifiers, newDList)
      }
    }

    return node
  }

  return visitEachChild(sourceFile, visitor, context)
}
