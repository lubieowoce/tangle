import * as t from "@babel/types";

export type FnPath =
  | t.NodePath<t.ArrowFunctionExpression>
  | t.NodePath<t.FunctionDeclaration>
  | t.NodePath<t.FunctionExpression>;
