import {
  addSyntheticLeadingComment,
  CallExpression,
  createCall,
  createExportAssignment,
  createIdentifier,
  createVariableDeclaration,
  createVariableDeclarationList,
  createVariableStatement,
  Decorator,
  Expression,
  isCallExpression,
  isClassDeclaration,
  NodeArray,
  NodeFlags,
  SourceFile,
  Statement,
  SyntaxKind,
  TypeChecker,
  updateCall,
  updateClassDeclaration,
  updateSourceFileNode,
} from 'typescript'
import { insertAfter, isReactClassComponent, replaceItem } from 'utils/react'

export const rcDecoratorToHoc = (typeChecker: TypeChecker) => () => (
  sourceFile: SourceFile
) => {
  let statements = Array.from(sourceFile.statements)
  for (const statement of sourceFile.statements) {
    if (
      isClassDeclaration(statement) &&
      isReactClassComponent(statement, typeChecker) &&
      statement.decorators &&
      statement.decorators.length > 0
    ) {
      let decorators: NodeArray<Decorator> | undefined = statement.decorators
      let hocs: Expression[] = statement.decorators.map(d => d.expression)
      const res = generateFromConnect(hocs, statements, typeChecker)
      hocs = res.hocs
      statements = res.statements
      if (
        statement.modifiers &&
        statement.modifiers.find(m => m.kind === SyntaxKind.ExportKeyword) &&
        statement.modifiers.find(m => m.kind === SyntaxKind.DefaultKeyword) &&
        statement.name
      ) {
        // statement
        const exportNode = createExport(statement.name.getText(), hocs)
        statements = insertAfter(
          statements,
          statements[statements.length - 1],
          exportNode
        )
        decorators = undefined
      }

      const newcls = updateClassDeclaration(
        statement,
        decorators,
        undefined,
        statement.name,
        statement.typeParameters,
        statement.heritageClauses,
        statement.members
      )

      statements = replaceItem(statements, statement, newcls)
    }
  }

  return updateSourceFileNode(sourceFile, statements)
}

const createExport = (name: string, hocs: Expression[]) => {
  let call: Expression = createIdentifier(name)
  for (const hoc of hocs) {
    call = createCall(hoc, undefined, [call])
  }
  return createExportAssignment(undefined, undefined, false, call)
}

const generateFromConnect = (
  hocs: Expression[],
  statements: Statement[],
  typeChecker: TypeChecker
) => {
  const connectIndex = hocs.findIndex(s => {
    if (isCallExpression(s)) {
      return s.expression.getText() === 'connect'
    }
    return false
  })

  if (connectIndex > -1) {
    let connect = hocs[connectIndex] as CallExpression
    let args = connect.arguments
    if (args[0] && args[0].getText() !== 'null') {
      // mapStateToProps
      const mapStateToProps = createVarFunc(
        'mapStateToProps',
        args[0],
        typeChecker
      )

      statements = insertAfter(
        statements,
        statements[statements.length - 1],
        mapStateToProps as any
      )

      hocs = replaceItem(
        hocs,
        connect,
        updateCall(
          connect,
          connect.expression,
          connect.typeArguments,
          replaceItem(args, args[0], createIdentifier('mapStateToProps'))
        )
      )
    }

    if (args[1] && args[1].getText() !== 'null') {
      // mapDispatchToProps

      const mapDispatchToProps = createVarFunc(
        'mapDispatchToProps',
        args[1],
        typeChecker
      )

      statements = insertAfter(
        statements,
        statements[statements.length - 1],
        mapDispatchToProps as any
      )
      connect = hocs[connectIndex] as CallExpression
      args = connect.arguments
      hocs = replaceItem(
        hocs,
        connect,
        updateCall(
          connect,
          connect.expression,
          connect.typeArguments,
          replaceItem(args, args[1], createIdentifier('mapDispatchToProps'))
        )
      )
    }
  }

  return { hocs, statements }
}

const createVarFunc = (
  name: string,
  exp: Expression,
  typeChecker: TypeChecker
) => {
  const node = typeChecker.getTypeAtLocation(exp)

  const declaration = createVariableDeclaration(
    name,
    typeChecker.typeToTypeNode(node),
    exp
  )
  const varS = createVariableStatement(
    undefined,
    createVariableDeclarationList([declaration], NodeFlags.Const)
  )
  return addSyntheticLeadingComment(
    varS,
    SyntaxKind.SingleLineCommentTrivia,
    ' TODO:'
  )
}
