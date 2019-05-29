import { createNodeArray, isClassDeclaration, isGetAccessorDeclaration, isPropertyDeclaration, Node, SourceFile, TransformationContext, TypeChecker, updateClassDeclaration, visitEachChild } from "typescript"
import { isPropTypesMember, isReactClassComponent, isStaticMember } from "../utils/react"

export const removeStaticPropTypes = (typeChecker: TypeChecker) => (context: TransformationContext) => (sourceFile: SourceFile) => {
  const visitor = (node: Node) => {
    if (isClassDeclaration(node) && isReactClassComponent(node, typeChecker)) {
      return updateClassDeclaration(node, node.decorators, node.modifiers, node.name, node.typeParameters, createNodeArray(node.heritageClauses), node.members.filter(m => {
        if (isPropertyDeclaration(m) && isStaticMember(m) && isPropTypesMember(m)) {
          // static and propTypes
          return false
        }

        if (isGetAccessorDeclaration(m) && isStaticMember(m) && isPropTypesMember(m)) {
          // static and propTypes
          return false
        }
        
        return true
      }))
    }
    return node
  }

  return visitEachChild(sourceFile, visitor, context)
}