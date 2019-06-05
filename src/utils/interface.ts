import {
  createArrayTypeNode,
  createFunctionTypeNode,
  createIndexSignature,
  createKeywordTypeNode,
  createLiteralTypeNode,
  createParameter,
  createPropertySignature,
  createToken,
  createTypeLiteralNode,
  createTypeReferenceNode,
  createUnionOrIntersectionTypeNode,
  createUnionTypeNode,
  Expression,
  isArrayLiteralExpression,
  isCallExpression,
  isNumericLiteral,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isStringLiteral,
  NodeArray,
  NumericLiteral,
  ObjectLiteralExpression,
  PropertyAccessExpression,
  StringLiteral,
  SyntaxKind,
  TypeNode,
} from 'typescript'

const isPropTypeRequired = (node: Expression) => {
  if (!isPropertyAccessExpression(node)) {
    return false
  }
  const text = node.getText()
  return text.includes('.isRequired')
}

const getTypeFromReactPropTypeExpression = (node: Expression): TypeNode => {
  let result = null

  if (isPropertyAccessExpression(node)) {
    // array bool func number object string symbol node element any
    const text = node.getText()

    if (/.string/.test(text)) {
      result = createKeywordTypeNode(SyntaxKind.StringKeyword)
    } else if (/.any/.test(text)) {
      result = createKeywordTypeNode(SyntaxKind.AnyKeyword)
    } else if (/.array/.test(text)) {
      result = createArrayTypeNode(createKeywordTypeNode(SyntaxKind.AnyKeyword))
    } else if (/.bool/.test(text)) {
      result = createKeywordTypeNode(SyntaxKind.BooleanKeyword)
    } else if (/.number/.test(text)) {
      result = createKeywordTypeNode(SyntaxKind.NumberKeyword)
    } else if (/.object/.test(text)) {
      result = createKeywordTypeNode(SyntaxKind.ObjectKeyword)
    } else if (/.node/.test(text)) {
      result = createTypeReferenceNode('React.ReactNode', [])
    } else if (/.element/.test(text)) {
      result = createTypeReferenceNode('JSX.Element', [])
    } else if (/.func/.test(text)) {
      const arrayOfAny = createParameter(
        [],
        [],
        createToken(SyntaxKind.DotDotDotToken),
        'args',
        undefined,
        createArrayTypeNode(createKeywordTypeNode(SyntaxKind.AnyKeyword)),
        undefined
      )
      result = createFunctionTypeNode(
        [],
        [arrayOfAny],
        createKeywordTypeNode(SyntaxKind.AnyKeyword)
      )
    }
  } else if (isCallExpression(node)) {
    // oneOf oneOfType arrayOf objectOf shape
    const text = node.expression.getText()
    const args = node.arguments[0]
    if (/.oneOf/.test(text)) {
      if (isArrayLiteralExpression(args)) {
        if (
          args.elements.every(
            elm => isStringLiteral(elm) || isNumericLiteral(elm)
          )
        ) {
          result = createUnionTypeNode(
            (args.elements as NodeArray<StringLiteral | NumericLiteral>).map(
              elm => createLiteralTypeNode(elm)
            )
          )
        }
      }
    } else if (/.oneOfType/.test(text)) {
      if (isArrayLiteralExpression(args)) {
        result = createUnionOrIntersectionTypeNode(
          SyntaxKind.UnionType,
          args.elements.map(getTypeFromReactPropTypeExpression)
        )
      }
    } else if (/.arrayOf/.test(text)) {
      if (args) {
        result = createArrayTypeNode(getTypeFromReactPropTypeExpression(args))
      }
    } else if (/.objectOf/.test(text)) {
      if (args) {
        result = createTypeLiteralNode([
          createIndexSignature(
            undefined,
            undefined,
            [
              createParameter(
                undefined,
                undefined,
                undefined,
                'key',
                undefined,
                createKeywordTypeNode(SyntaxKind.StringKeyword)
              ),
            ],
            getTypeFromReactPropTypeExpression(args)
          ),
        ])
      }
    } else if (/.shapeOf/.test(text)) {
      if (isObjectLiteralExpression(args)) {
        return buildInterfaceFromPropTypes(args)
      }
    }
  }

  if (!result) {
    result = createKeywordTypeNode(SyntaxKind.AnyKeyword)
  }

  return result
}

export const buildInterfaceFromPropTypes = (exp: ObjectLiteralExpression) => {
  const members = exp.properties
    // only a: 1
    .filter(isPropertyAssignment)
    // no need for children
    .filter(p => p.name.getText() !== 'children')
    .map(property => {
      const name = property.name.getText()
      const initializer = property.initializer
      const isRequired = isPropTypeRequired(initializer)
      const typeExpression = isRequired
        ? (initializer as PropertyAccessExpression).expression
        : initializer
      const typeValue = getTypeFromReactPropTypeExpression(typeExpression)

      return createPropertySignature(
        [],
        name,
        isRequired ? undefined : createToken(SyntaxKind.QuestionToken),
        typeValue,
        undefined
      )
    })

  return createTypeLiteralNode(members)
}
