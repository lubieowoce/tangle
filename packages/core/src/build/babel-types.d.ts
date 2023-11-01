import { NodePath } from "@babel/core";
import * as t from "@babel/types";

export type FnPath =
  | NodePath<t.ArrowFunctionExpression>
  | NodePath<t.FunctionDeclaration>
  | NodePath<t.FunctionExpression>;
