
import { ClassDeclaration, ConstructorDeclaration, createInterfaceDeclaration, createKeywordTypeNode, createProperty, createTypeLiteralNode, createTypeReferenceNode, createUnionOrIntersectionTypeNode, forEachChild, GetAccessorDeclaration, isBinaryExpression, isCallExpression, isClassDeclaration, isExpressionStatement, isGetAccessorDeclaration, isIntersectionTypeNode, isMethodDeclaration, isObjectLiteralExpression, isPropertyAccessExpression, isPropertyDeclaration, isReturnStatement, isTypeLiteralNode, isUnionTypeNode, Node, NodeBuilderFlags, ObjectLiteralExpression, SourceFile, SyntaxKind, TypeChecker, TypeElement, TypeLiteralNode, TypeNode, updateClassDeclaration, updateExpressionWithTypeArguments, updateHeritageClause, updateSourceFileNode } from "typescript"
import { buildInterfaceFromPropTypes } from "../utils/interface"
import { insertBefore, isPropTypesMember, isReactClassComponent, isStaticMember, removeItem, replaceItem } from "../utils/react"

const visitReactClassComponent = (cls: ClassDeclaration, sourceFile: SourceFile, typeChecker: TypeChecker) => {
  const className = cls && cls.name && cls.name.getText(sourceFile)
  const propType = getPropTypeOfComponent(cls)
  const stateType = getStateTypeOfComponent(cls, typeChecker)
  
  const shouldMakePropType = propType.members.length > 0
  const shouldMakeStateType = !isStateTypeMemberEmpty(stateType)
  const propName = `I${className}Props`
  const stateName = `I${className}State`
  const propInterface = createInterfaceDeclaration([],[],propName, [], [], propType.members)
  
  const stateMembers: TypeElement[] = []
  if (isUnionTypeNode(stateType) || isIntersectionTypeNode(stateType) ) {
    stateType.types.forEach(t => {
      stateMembers.push(...(t as TypeLiteralNode).members)
    })
  }
  
  const stateInterface = createInterfaceDeclaration([],[],stateName, [], [], stateMembers)

  const PropTypeRef = createTypeReferenceNode(propName, [])
  const StateTypeRef = createTypeReferenceNode(stateName, [])

  let newCls = getNewCls(cls, shouldMakePropType ? PropTypeRef : propType, shouldMakeStateType? StateTypeRef : stateType)
  newCls = findConstructorThis(newCls)
  const allTypes = []

  if (shouldMakePropType) { allTypes.push(propInterface) }
  if (shouldMakeStateType) { allTypes.push(stateInterface) }

  let statements = insertBefore(sourceFile.statements, cls, allTypes)
  statements = replaceItem(statements, cls, newCls)
  
  return updateSourceFileNode(sourceFile, statements)
}

const getNewCls = (cls: ClassDeclaration, propType: TypeNode, stateType: TypeNode) => {
  if (!cls.heritageClauses || !cls.heritageClauses.length) {
    return cls
  }

  const superComponent = cls.heritageClauses[0]

  const newSuperComponentType = replaceItem(
    superComponent.types,
    superComponent.types[0],
    updateExpressionWithTypeArguments(
      superComponent.types[0],
      [propType, stateType],
      superComponent.types[0].expression
    )
  )

  const newSuperComponent = replaceItem(
    cls.heritageClauses,
    superComponent,
    updateHeritageClause(superComponent, newSuperComponentType)
  )
  
  return updateClassDeclaration(
    cls,
    cls.decorators,
    cls.modifiers,
    cls.name,
    cls.typeParameters,
    newSuperComponent,
    cls.members
  )
}

const getStateTypeOfComponent = (cls: ClassDeclaration, typeChecker: TypeChecker) => {
  const initState = getInitialStateFromClass(cls, typeChecker)
  const isVoid = initState.kind === SyntaxKind.VoidKeyword

  if (isVoid) {
    return createTypeLiteralNode([])
  }
  
  return createUnionOrIntersectionTypeNode(SyntaxKind.IntersectionType, [initState])
}

export const getStateFromSetState = (cls: ClassDeclaration, typeChecker: TypeChecker) => {
  const typeNodes: TypeNode[] = []
  for (const member of cls.members) {
    if (member && isMethodDeclaration(member) && member.body) {
      findSetState(member.body)
    }
  }

  return typeNodes

  function findSetState(node: Node) {
    forEachChild(node, findSetState)
    if (isExpressionStatement(node) && isCallExpression(node.expression) && node.expression.expression.getText().match(/setState/)) {
      const type = typeChecker.getTypeAtLocation(node.expression.arguments[0])
      typeNodes.push(typeChecker.typeToTypeNode(type, undefined, NodeBuilderFlags.NoTruncation)!)
    }
  }
}

const getInitialStateFromClass = (cls: ClassDeclaration, typeChecker: TypeChecker): TypeNode => {
  // state = {}
  const stateMember = cls.members.find(m => isPropertyDeclaration(m) && m.name && m.name.getText() === 'state')

  if (stateMember && isPropertyDeclaration(stateMember) && stateMember.initializer) {
    
    const type = typeChecker.getTypeAtLocation(stateMember.initializer)
    return typeChecker.typeToTypeNode(type, undefined, NodeBuilderFlags.NoTruncation)!
  }

  // constructor
  const constructor = cls.members.find(m => m.kind === SyntaxKind.Constructor) as ConstructorDeclaration | undefined
  if (constructor && constructor.body) {
    for (const statement of constructor.body.statements) {
      if (isExpressionStatement(statement) && isBinaryExpression(statement.expression) && statement.expression.left.getText() === 'this.state') {
        const right = statement.expression.right as ObjectLiteralExpression
        const type = typeChecker.getTypeAtLocation(right)
        return typeChecker.typeToTypeNode(type, undefined, NodeBuilderFlags.NoTruncation)!
      }
    }
  }

  return createKeywordTypeNode(SyntaxKind.VoidKeyword)
}

const findConstructorThis = (cls: ClassDeclaration) => {
  
  const constructor = cls.members.find(m => m.kind === SyntaxKind.Constructor) as ConstructorDeclaration
  if (constructor && constructor.body) {
    const properties = []
    for (const statement of constructor.body.statements) {
      if (isExpressionStatement(statement) && isBinaryExpression(statement.expression)) {
        if (isPropertyAccessExpression(statement.expression.left)) {
          const name = statement.expression.left.name.getText()
          
          const property = createProperty(undefined, undefined, name, undefined, undefined, statement.expression.right)
          
          properties.push(property)
        }
      }
    }
    let members = insertBefore(cls.members, constructor, properties)
    members = removeItem(members, constructor)
    return updateClassDeclaration(cls, cls.decorators, cls.modifiers, cls.name, cls.typeParameters, cls.heritageClauses, members)
  }
  
  return cls
}

const getPropTypeOfComponent = (cls: ClassDeclaration) => {
  const staticPropTypes = cls.members.find(m => (isPropertyDeclaration(m) && isStaticMember(m) && isPropTypesMember(m)))

  if (staticPropTypes !== undefined && isPropertyDeclaration(staticPropTypes) && staticPropTypes.initializer && isObjectLiteralExpression(staticPropTypes.initializer)) {
    return buildInterfaceFromPropTypes(staticPropTypes.initializer)
  }

  const staticGetterPropTypes = cls.members.find(m => (isGetAccessorDeclaration(m) && isStaticMember(m) && isPropTypesMember(m)))

  if (staticGetterPropTypes !== undefined) {
    const returnStatement = (staticGetterPropTypes as GetAccessorDeclaration).body!.statements.find(s => isReturnStatement(s))

    if (returnStatement !== undefined && isReturnStatement(returnStatement) && returnStatement.expression && isObjectLiteralExpression(returnStatement.expression)) {
      return buildInterfaceFromPropTypes(returnStatement.expression)
    }
  }

  return createTypeLiteralNode([])
}

export const generateGenericPropAndState = (typeChecker: TypeChecker) => () => (sourceFile: SourceFile) => {
  let newSourceFile = sourceFile
  for (const statement of sourceFile.statements) {
    if (isClassDeclaration(statement) && isReactClassComponent(statement, typeChecker)) {
      // react class component
      newSourceFile = visitReactClassComponent(statement, newSourceFile, typeChecker)
    }
  }
  
  return newSourceFile
}

function isStateTypeMemberEmpty(stateType: TypeNode): boolean {
  if (isTypeLiteralNode(stateType)) {
    return stateType.members.length === 0
  }

  if (!isIntersectionTypeNode(stateType)) {
    return true
  }

  return stateType.types.every(isStateTypeMemberEmpty)
}