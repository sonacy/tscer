import {
  addSyntheticLeadingComment,
  ArrowFunction,
  Block,
  CallExpression,
  ClassDeclaration,
  createCall,
  createExportAssignment,
  createIdentifier,
  createIntersectionTypeNode,
  createTypeQueryNode,
  createTypeReferenceNode,
  createVariableDeclaration,
  createVariableDeclarationList,
  createVariableStatement,
  Decorator,
  Expression,
  isArrowFunction,
  isCallExpression,
  isClassDeclaration,
  isExportAssignment,
  isInterfaceDeclaration,
  isObjectLiteralExpression,
  isReturnStatement,
  NodeArray,
  NodeBuilderFlags,
  NodeFlags,
  SourceFile,
  Statement,
  SyntaxKind,
  TypeChecker,
  TypeReferenceNode,
  updateCall,
  updateClassDeclaration,
  updateExpressionWithTypeArguments,
  updateHeritageClause,
  updateInterfaceDeclaration,
  updateSourceFileNode,
} from 'typescript'

import { insertAfter, isReactClassComponent, removeItem, replaceItem } from '../utils/react'

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
      const res = generateFromConnect(hocs, statements, typeChecker, statement)
      hocs = res.hocs
      statements = res.statements
      const cls = res.newCls
      if (
        cls.modifiers &&
        cls.modifiers.find(m => m.kind === SyntaxKind.ExportKeyword) &&
        cls.modifiers.find(m => m.kind === SyntaxKind.DefaultKeyword) &&
        cls.name
      ) {
        // statement
        const exportNode = createExport(cls.name.getText(), hocs)
        statements = insertAfter(
          statements,
          statements[statements.length - 1],
          exportNode
        )
        decorators = undefined
      } else {
        const exportAssignment = sourceFile.statements.find(
          s =>
            isExportAssignment(s) && s.getText().includes(cls.name!.getText())
        )
        if (exportAssignment && isExportAssignment(exportAssignment)) {
          decorators = undefined
          if (isCallExpression(exportAssignment.expression)) {
            hocs = getHocFromExport(exportAssignment.expression, hocs)
          }
          const exportNode = createExport(cls.name!.getText(), hocs)
          statements = removeItem(statements, exportAssignment)
          statements = insertAfter(
            statements,
            statements[statements.length - 1],
            exportNode
          )
        }
      }

      const newcls = updateClassDeclaration(
        cls,
        decorators,
        undefined,
        cls.name,
        cls.typeParameters,
        cls.heritageClauses,
        cls.members
      )

      statements = replaceItem(statements, cls, newcls)
    }
  }

  return updateSourceFileNode(sourceFile, statements)
}

const getHocFromExport = (
  exp: CallExpression,
  hocs: Expression[]
): Expression[] => {
  hocs = [exp.expression, ...hocs]
  if (exp.arguments && exp.arguments.length > 0) {
    const argExp = exp.arguments[0]
    if (isCallExpression(argExp)) {
      return getHocFromExport(argExp, hocs)
    }
  }

  return hocs
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
  typeChecker: TypeChecker,
  cls: ClassDeclaration
) => {
  const connectIndex = hocs.findIndex(s => {
    if (isCallExpression(s)) {
      return s.expression.getText() === 'connect'
    }
    return false
  })

  let newCls = cls

  if (connectIndex > -1) {
    let connect = hocs[connectIndex] as CallExpression
    let args = connect.arguments
    const types: TypeReferenceNode[] = []

    const props: string[] = []
    const exp0 = args[0]
    const exp1 = args[1]

    if (exp0 && exp0.getText() !== 'null') {
      // mapStateToProps
      const mapStateToProps = createVarFunc(
        'mapStateToProps',
        exp0,
        typeChecker
      )

      if (isArrowFunction(exp0)) {
        props.push(...getPropStrFromConnect(exp0))
      }

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

      types.push(
        createTypeReferenceNode(createIdentifier('ReturnType'), [
          createTypeQueryNode(createIdentifier('mapStateToProps')),
        ])
      )
    }

    if (exp1 && exp1.getText() !== 'null') {
      // mapDispatchToProps

      const mapDispatchToProps = createVarFunc(
        'mapDispatchToProps',
        exp1,
        typeChecker
      )

      if (isArrowFunction(exp1)) {
        props.push(...getPropStrFromConnect(exp1))
      }

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

      types.push(
        createTypeReferenceNode(createIdentifier('ReturnType'), [
          createTypeQueryNode(createIdentifier('mapDispatchToProps')),
        ])
      )
    }
    // remove duplicated props
    if (props.length > 0) {
      const className = cls.name!.getText()
      const propsInterface = statements.find(
        s =>
          isInterfaceDeclaration(s) &&
          s.name.escapedText === `I${className}Props`
      )
      if (propsInterface && isInterfaceDeclaration(propsInterface)) {
        const newMembers = propsInterface.members.filter((m: any) => {
          return !props.includes(m.name.escapedText)
        })
        const newPropsInterface = updateInterfaceDeclaration(
          propsInterface,
          propsInterface.decorators,
          propsInterface.modifiers,
          propsInterface.name,
          propsInterface.typeParameters,
          propsInterface.heritageClauses,
          newMembers
        )
        statements = replaceItem(statements, propsInterface, newPropsInterface)
      }
    }

    // set ReturnType
    if (types.length > 0) {
      const baseType = cls.heritageClauses![0].types![0].typeArguments![0]
      const type = createIntersectionTypeNode([baseType, ...types])

      const superComponent = cls.heritageClauses![0]

      const newSuperComponentType = replaceItem(
        superComponent.types,
        superComponent.types[0],
        updateExpressionWithTypeArguments(
          superComponent.types[0],
          [type, superComponent.types[0].typeArguments![1]],
          superComponent.types[0].expression
        )
      )

      const newSuperComponent = replaceItem(
        cls.heritageClauses!,
        superComponent,
        updateHeritageClause(superComponent, newSuperComponentType)
      )

      newCls = updateClassDeclaration(
        cls,
        cls.decorators,
        cls.modifiers,
        cls.name,
        cls.typeParameters,
        newSuperComponent,
        cls.members
      )

      statements = replaceItem(statements, cls, newCls)
    }
  }

  return { hocs, statements, newCls }
}

const createVarFunc = (
  name: string,
  exp: Expression,
  typeChecker: TypeChecker
) => {
  const node = typeChecker.getTypeAtLocation(exp)

  const declaration = createVariableDeclaration(
    name,
    typeChecker.typeToTypeNode(node, undefined, NodeBuilderFlags.NoTruncation),
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

const getPropStrFromConnect = (exp: ArrowFunction) => {
  let properties: string[] = []
  const body = exp.body as Block

  // get from return
  if (body && body.statements) {
    body.statements.forEach(s => {
      if (
        isReturnStatement(s) &&
        s.expression &&
        isObjectLiteralExpression(s.expression)
      ) {
        properties = [
          ...properties,
          ...s.expression.properties.map(p => p.name!.getText()),
        ]
      }
    })
  }

  // get from direct
  const nextContainer = (exp as any).nextContainer
  if (nextContainer && nextContainer.properties) {
    properties = [
      ...properties,
      ...nextContainer.properties.map((a: any) => a.name.getText()),
    ]
  }

  return properties
}
