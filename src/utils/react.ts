import { ClassDeclaration, ClassElement, isIdentifier, SyntaxKind, TypeChecker } from "typescript"

// extends React.Component | Component | PureComponent | React.PureComponent
export const isReactClassComponent = (classes: ClassDeclaration, checker: TypeChecker) => {
  if (!classes.heritageClauses) { 
    return false
  }

  if (classes.heritageClauses.length !== 1) {
    return false
  }
  const firstHeritageClause = classes.heritageClauses[0]
  if (firstHeritageClause.token !== SyntaxKind.ExtendsKeyword) {
    return false
  }

  const firstArgumentTypes = firstHeritageClause.types[0]
  if (!firstArgumentTypes) {
    return false
  }

  const type = checker.getTypeAtLocation(firstArgumentTypes)
  let name = type && type.symbol && type.symbol.name
  if (!name) {
    name = firstArgumentTypes.expression.getText()
  }

  if (!/React\.Component|Component|PureComponent|React\.PureComponent/.test(name)) {
    return false
  }

  return true
}

// static propTypes
export const isStaticMember = (member: ClassElement) => {
  if (!member.modifiers) {
    return false
  }
  const staticModifier = member.modifiers.find(modifier => {
    return modifier.kind === SyntaxKind.StaticKeyword
  })
  return staticModifier !== undefined
}

// static propTypes
export const isPropTypesMember = (member: ClassElement) => {
  try {
    const name = member.name !== undefined && isIdentifier(member.name) ? member.name.escapedText : null
    return name === 'propTypes'
  } catch(e) {
    return false
  }
}

export const insertAfter = <T>(collection: ArrayLike<T>, afterItem: T, newItem: T) => {
  const arr = Array.from(collection)
  const index = arr.indexOf(afterItem) + 1
  return arr.slice(0, index).concat(newItem).concat(arr.slice(index))
}

export const insertBefore = <T>(collection: ArrayLike<T>, beforeItem: T, newItem: T | T[]) => {
  const arr = Array.from(collection)
  const index = arr.indexOf(beforeItem)
  return arr.slice(0, index).concat(newItem).concat(arr.slice(index))
}

export const replaceItem = <T>(collection: ArrayLike<T>, item: T, newItem: T) => {
  const arr = Array.from(collection)
  const index = arr.indexOf(item)
  return arr.slice(0, index).concat(newItem).concat(arr.slice(index + 1))
}

export const removeItem = <T>(collection: ArrayLike<T>, item: T) => {
  const arr = Array.from(collection)
  const index = arr.indexOf(item)
  return arr.slice(0, index).concat(arr.slice(index + 1))
}