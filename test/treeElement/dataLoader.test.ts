import type { TriggerEvent } from "treeElement/methodTypes";
import type { DataFilter } from "treeElement/options";

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import DataLoader from "treeElement/dataLoader";
import RequestUrl from "treeElement/requestUrl";
import { vi } from "vitest";

import defaultClassNames from "../support/classNames";

describe("loadFromUrl", () => {
    const server = setupServer();

    beforeAll(() => {
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    afterAll(() => {
        server.close();
    });

    const setupResponse = () => {
        server.use(
            http.get(
                "/test",
                () =>
                    new HttpResponse('{ "key1": "value1" }'),
                {},
            ),
        );
    }

    const setupErrorResponse = (status: number) => {
        server.use(
            http.get(
                "/test",
                () =>
                    new HttpResponse('', {
                        status,
                    }),
                {},
            ),
        );
    }

    const createDataLoader = (dataFilter?: DataFilter) => {
        const loadData = vi.fn();
        const treeElement = document.createElement("div");
        const triggerEvent = vi.fn<TriggerEvent>();

        const dataLoader = new DataLoader({
            classNames: defaultClassNames,
            dataFilter,
            loadData,
            treeElement,
            triggerEvent,
        });

        return { dataLoader, loadData, treeElement, triggerEvent };
    }

    it("calls loadData with the parsed json data", async () => {
        setupResponse();

        const { dataLoader, loadData } = createDataLoader();
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(loadData).toHaveBeenCalledExactlyOnceWith({ key1: "value1" }, undefined);
    });

    it("returns a promise that resolves after the data is loaded", async () => {
        setupResponse();

        const { dataLoader, loadData } = createDataLoader();
        const promise = dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(loadData).not.toHaveBeenCalled();

        await promise;

        expect(loadData).toHaveBeenCalledExactlyOnceWith({ key1: "value1" }, undefined);
    });

    it("triggers tree.load_failed with a 404 error", async () => {
        setupErrorResponse(404);

        const { dataLoader, triggerEvent } = createDataLoader();
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(triggerEvent).toHaveBeenCalledWith("tree.load_failed", {
            response: expect.objectContaining({ status: 404 }) as Response,
        });
    });

    it("triggers tree.load_failed with a 500 error", async () => {
        setupErrorResponse(500);

        const { dataLoader, triggerEvent } = createDataLoader();
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(triggerEvent).toHaveBeenCalledWith("tree.load_failed", {
            response: expect.objectContaining({ status: 500 }) as Response,
        });
    });

    it("triggers tree.load_failed when fetch fails with a network error", async () => {
        server.use(
            http.get("/test", () => HttpResponse.error()),
        );

        const { dataLoader, triggerEvent } = createDataLoader();
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(triggerEvent).toHaveBeenCalledWith(
            "tree.load_failed",
            expect.objectContaining({
                error: expect.objectContaining({
                    message: "Failed to fetch",
                    name: "TypeError",
                }) as TypeError,
            }),
        );
    });

    it("triggers tree.loading_data and tree.loaded_data events", async () => {
        setupResponse();

        const { dataLoader, treeElement, triggerEvent } = createDataLoader();
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(triggerEvent).toHaveBeenNthCalledWith(
            1,
            "tree.loading_data",
            {
                element: treeElement,
                node: undefined
            }
        );
        expect(triggerEvent).toHaveBeenNthCalledWith(
            2,
            "tree.loaded_data",
            {
                element: treeElement,
                node: undefined
            }
        );
    });

    it("calls dataFilter", async () => {
        setupResponse();

        const dataFilter = () => ["changed"]

        const { dataLoader, loadData } = createDataLoader(dataFilter);
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        expect(loadData).toHaveBeenCalledExactlyOnceWith(["changed"], undefined);
    });

    it("adds a parameter with a timestamp to force the response not to be cached", async () => {
        let requestUrl = "";

        server.use(
            http.get(
                "/test",
                ({ request }) => {
                    requestUrl = request.url;
                    return new HttpResponse('{ "key1": "value1" }')
                }
            ),
        );

        const { dataLoader } = createDataLoader();
        await dataLoader.loadFromUrl(new RequestUrl("/test"));

        const url = new URL(requestUrl);

        expect(url.pathname).toBe("/test");

        const cacheBuster = url.searchParams.get('_');

        expect(cacheBuster).toBeString();
        expect(cacheBuster).not.toBeEmpty();
    });
});
