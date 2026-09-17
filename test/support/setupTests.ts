import "@testing-library/jest-dom/vitest";
import * as matchers from "jest-extended";
import { mockAnimationsApi } from "jsdom-testing-mocks";
import { expect } from "vitest";

import "./treeElementMatchers";

expect.extend(matchers);

mockAnimationsApi();
