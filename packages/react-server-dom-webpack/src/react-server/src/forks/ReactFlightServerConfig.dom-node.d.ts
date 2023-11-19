/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type { AsyncLocalStorage } from "async_hooks";

// import type { Request } from "react-server/src/ReactFlightServer";

export * from "react-server-dom-webpack/src/ReactFlightServerConfigWebpackBundler";
// export * from "react-dom-bindings/src/server/ReactFlightServerConfigDOM";

export const supportsRequestStorage = true;
export declare const requestStorage: AsyncLocalStorage<Request>;
