import type { ClassNames } from "./classNames";
import type { LoadData, TriggerEvent } from "./methodTypes";
import type { Node, NodeData } from "./node";
import type { DataFilter } from "./options";
import type RequestUrl from "./requestUrl";

interface DataLoaderParams {
    classNames: ClassNames;
    dataFilter?: DataFilter;
    loadData: LoadData;
    treeElement: HTMLElement;
    triggerEvent: TriggerEvent;
}

export default class DataLoader {
    private abortController: AbortController;
    private classNames: ClassNames;
    private dataFilter?: DataFilter;
    private loadData: LoadData;
    private treeElement: HTMLElement;
    private triggerEvent: TriggerEvent;

    constructor({
        classNames,
        dataFilter,
        loadData,
        treeElement,
        triggerEvent,
    }: DataLoaderParams) {
        this.abortController = new AbortController();
        this.classNames = classNames;
        this.dataFilter = dataFilter;
        this.loadData = loadData;
        this.treeElement = treeElement;
        this.triggerEvent = triggerEvent;
    }

    public deinit(): void {
        this.abortController.abort();
    }

    public async loadFromUrl(
        url: RequestUrl,
        node?: Node,
    ): Promise<void> {
        const element = node?.element ?? this.treeElement;
        element.classList.add(this.classNames.loading);

        this.triggerEvent("tree.loading_data", {
            element,
            node,
        });

        const stopLoading = (): void => {
            element.classList.remove(this.classNames.loading);
            this.triggerEvent("tree.loaded_data", {
                element,
                node,
            });
        };

        const handleResponse = async (response: Response): Promise<void> => {
            if (response.ok) {
                const data = (await response.json()) as NodeData[];

                stopLoading();
                this.loadData(
                    this.dataFilter ? this.dataFilter(data) : data,
                    node
                );
            } else {
                stopLoading();

                this.triggerEvent("tree.load_failed", { response });
            }
        };

        const signal = this.abortController.signal;
        url.setSearchParam("_", Date.now().toString());

        return fetch(url.toString(), { headers: { "Content-Type": "application/json" }, signal })
            .then(handleResponse)
            .catch((error: unknown) => {
                if (this.abortController.signal.aborted) {
                    // The request was aborted by deinit.
                    return;
                }

                stopLoading();
                this.triggerEvent("tree.load_failed", { error });
            });
    }
}
