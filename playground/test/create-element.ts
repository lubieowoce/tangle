type AnyProps = Record<string, any> | null;
export type ElementType<TProps extends AnyProps = AnyProps> =
  | string
  | ((props: TProps) => JSXElement)
  | { $$typeof: typeof CLIENT_REFERENCE; filepath: string; name: string };

export type TextElement = string;
export type JSXElement<TProps extends AnyProps = AnyProps> =
  | {
      type: ElementType<TProps>;
      props: TProps;
    }
  | TextElement
  | null;

export type JSXChildren = JSXElement | JSXElement[] | undefined;

export const jsx = <TProps extends AnyProps = AnyProps>(
  type: ElementType<TProps>,
  props: TProps
): JSXElement => {
  return { type: type as any, props };
};

type RenderedTree =
  | { type: string; attrs?: AnyProps; children?: RenderedTree | RenderedTree[] }
  | string
  | null;

const CLIENT_REFERENCE: unique symbol = /* @__PURE__*/ Symbol.for(
  "react.client.reference"
);

declare var __webpack_require__: (id: string | number) => any;

const CLIENT_REFERENCE_TAG = "CLIENT-REFERENCE";

// emulated Flight

type RenderToTreeOpts = {
  manifest: Record<string, ClientRefInfo>;
};

type ClientRefInfo = { id: string; chunks: string[]; name: string };
type ClientRefTreeNodeAttrs = {
  ref: ClientRefInfo;
  props: Record<string, any>;
};

export const renderToTree = (
  element: JSXElement,
  opts: RenderToTreeOpts
): RenderedTree => {
  console.log("renderToTree", element);
  if (typeof element === "string") {
    return element;
  }
  if (element === null) {
    return null;
  }
  const { type, props } = element;
  if (typeof type === "function") {
    if (type["$$typeof"] === CLIENT_REFERENCE) {
      const { children, ...propsWithoutChildren } = props || {};
      const childrenTree = renderChildren(children, opts);
      const { name, filepath } = type as any;
      const mapKey = filepath + "#" + name;
      const mappedRef = opts.manifest[mapKey];
      if (!mappedRef) {
        throw new Error(`No map entry for ${mapKey}`);
      }
      const attrs: ClientRefTreeNodeAttrs = {
        ref: mappedRef,
        props: propsWithoutChildren,
      };
      return {
        type: CLIENT_REFERENCE_TAG,
        attrs,
        children: childrenTree,
      };
    }
    console.log("rendering component", type, type["$$typeof"]);
    const treeFromComponent = type(props);
    return renderToTree(treeFromComponent, opts);
  }
  if (typeof type === "string") {
    const { children, ...propsWithoutChildren } = props || {};
    const childrenTree = renderChildren(children, opts);
    return { type, attrs: propsWithoutChildren, children: childrenTree };
  }
  throw new Error(
    `Got a weird element ${typeof type}: ${JSON.stringify(type)}`
  );
};

const renderChildren = (
  children: unknown,
  opts: RenderToTreeOpts
): RenderedTree | RenderedTree[] => {
  if (!children) {
    return "";
  }
  if (typeof children === "object" && Array.isArray(children)) {
    // flatten anny nested arrays
    const res: RenderedTree[] = [];
    const visitChild = (child) => {
      if (Array.isArray(child)) {
        for (const subChild of child) {
          visitChild(subChild);
        }
      } else {
        res.push(renderToTree(child, opts));
      }
    };
    for (const child of children) {
      visitChild(child);
    }
    return res;
  }
  if (typeof children === "object") {
    if ("type" in children) {
      return renderToTree(children as JSXElement, opts);
    } else {
      console.error("Invalid child (object)", children);
      throw new Error("Invalid child (object)");
    }
  }
  if (typeof children === "number") {
    return children + "";
  }
  if (typeof children === "string") {
    return children;
  }
  console.error(`Invalid child (${typeof children})`, children);
  throw new Error(`Invalid child (${typeof children})`);
};

// SSR

type RenderTreeToStringOpts = {
  manifest: Record<string, Record<string, { specifier: string; name: string }>>;
};

export const renderTreeToString = (
  tree: RenderedTree,
  opts: RenderTreeToStringOpts,
  indentLevel = 0
): string => {
  const line = (str: string) => indentLine(str, indentLevel);

  if (!tree) return "";
  if (typeof tree === "string") return line(tree);

  if (tree.type === CLIENT_REFERENCE_TAG) {
    const attrs = tree.attrs as ClientRefTreeNodeAttrs;
    const resolvedRef = opts.manifest[attrs.ref.id][attrs.ref.name];
    console.log("ssr manifest", resolvedRef);
    const component = __webpack_require__(resolvedRef.specifier)[
      resolvedRef.name
    ];
    console.log("imported component", component);
    const childrenPlaceholder = "__REPLACE_ME__";
    const childrenToInject = ["<!-- -->", childrenPlaceholder, "<!-- -->"];
    const finalTree = renderToTree(
      jsx(component, { ...attrs.props, children: childrenToInject }),
      { manifest: {} /* shouldn't be needed anymore... */ }
    );

    // if (!tree.children) {
    //   // do nothing
    // } else if (typeof tree.children === "string") {
    //   childrenToInject.push(tree.children);
    // } else if (Array.isArray(tree.children)) {
    //   childrenToInject.push(...tree.children);
    // } else if (typeof tree.children === "object") {
    //   childrenToInject.push(tree.children);
    // } else {
    //   throw new Error("Got some weird children");
    // }

    const renderedStr = renderTreeToString(finalTree, opts, indentLevel);
    const renderedChildren = renderTreeChildrenToString(tree.children, opts);
    return renderedStr.replace(childrenPlaceholder, renderedChildren);
    // return lines([
    //   line(`<client:${tree.attrs!.name}>`),
    //   renderTreeChildren(tree.children ?? null, opts, indentLevel + 1),
    //   line(`</client:${tree.attrs!.name}>`),
    // ]);
  }

  const tag = tree.type;
  let openTagStr = tag;
  let attrsStr = "";
  if (tree.attrs) {
    for (const key in tree.attrs) {
      attrsStr += ` ${key}=${JSON.stringify(tree.attrs?.[key])}`;
    }
  }
  if (attrsStr) {
    openTagStr += attrsStr;
  }
  return lines([
    line(`<${openTagStr}>`),
    renderTreeChildrenToString(tree.children ?? null, opts, indentLevel + 1),
    line(`</${tag}>`),
  ]);
};

const renderTreeChildrenToString = (
  children: unknown,
  opts: RenderTreeToStringOpts,
  indentLevel = 0
) => {
  return lines(
    asArray(children ?? null).map((child) =>
      renderTreeToString(child, opts, indentLevel)
    )
  );
};

const lines = (ls: string[]) => ls.join("");

const indentLine = (line: string, indentLevel = 0) => {
  const indent = "  ".repeat(indentLevel);
  return indent + line + "\n";
};

const asArray = (x) => (Array.isArray(x) ? x : [x]);

// const isEmptyObject = (obj: Record<string, any>) => {
//   for (const _key in obj) {
//     return true;
//   }
//   return false;
// };
