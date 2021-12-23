import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import {
    KfLayoutDirection,
    KfLayoutTargetDirectionClassName,
} from '@root/src/typings/enums';
import {
    KfExtConfigs,
    KfConfig,
    BrokerStateStatusTypes,
    KfLocation,
    KfCategoryTypes,
} from '@kungfu-trader/kungfu-js-api/typings';
import {
    getIdByKfLocation,
    getKfExtensionConfig,
} from '@kungfu-trader/kungfu-js-api/utils/busiUtils';
import { getAllKfConfigOriginData } from '@kungfu-trader/kungfu-js-api/actions';
import {
    Pm2ProcessStatusDetailData,
    Pm2ProcessStatusData,
} from '@kungfu-trader/kungfu-js-api/utils/processUtils';

interface GlobalState {
    boardsMap: KfLayout.BoardsMap;
    dragedContentData: KfLayout.ContentData | null;
    isBoardDragging: boolean;
    extConfigs: KfExtConfigs;
    tdList: KfConfig[];
    mdList: KfConfig[];
    strategyList: KfConfig[];

    processStatusData: Pm2ProcessStatusData;
    processStatusWithDetail: Pm2ProcessStatusDetailData;

    appStates: Record<string, BrokerStateStatusTypes>;
    assets: Record<string, Asset>;

    currentGlobalKfLocation: KfLocation | KfConfig | null;
}

export const useGlobalStore = defineStore('global', {
    state: (): GlobalState => {
        return {
            boardsMap: {},
            dragedContentData: null,
            isBoardDragging: false,
            extConfigs: toRaw<KfExtConfigs>({}),

            tdList: [],
            mdList: [],
            strategyList: [],

            processStatusData: {},
            processStatusWithDetail: {},

            appStates: {},
            assets: {},

            currentGlobalKfLocation: null,
        };
    },

    actions: {
        setCurrentGlobalKfLocation(kfLocation: KfLocation | KfConfig | null) {
            this.currentGlobalKfLocation = kfLocation;
        },

        setAppStates(appStates: Record<string, BrokerStateStatusTypes>) {
            this.appStates = appStates;
        },

        setAssets(assets: Record<string, Asset>) {
            this.assets = assets;
        },

        setProcessStatus(processStatus: Pm2ProcessStatusData) {
            this.processStatusData = toRaw(processStatus);
        },

        setProcessStatusWithDetail(
            processStatusWithDetail: Pm2ProcessStatusDetailData,
        ) {
            this.processStatusWithDetail = toRaw(processStatusWithDetail);
        },

        setKfConfigList() {
            return getAllKfConfigOriginData().then((res) => {
                const { md, td, strategy } = res;
                this.mdList = md;
                this.tdList = td;
                this.strategyList = strategy;

                if (this.currentGlobalKfLocation === null) {
                    if (td.length) {
                        this.setCurrentGlobalKfLocation(td[0]);
                        return;
                    }
                } else if (!this.checkCurrentGlobalKfLocationExisted()) {
                    if (this.currentGlobalKfLocation?.category === 'td') {
                        if (this.tdList.length) {
                            this.setCurrentGlobalKfLocation(td[0]);
                            return;
                        }
                    } else if (
                        this.currentGlobalKfLocation?.category === 'strategy'
                    ) {
                        if (this.strategyList.length) {
                            this.setCurrentGlobalKfLocation(strategy[0]);
                            return;
                        }
                    }
                }

                this.setCurrentGlobalKfLocation(null);
            });
        },

        checkCurrentGlobalKfLocationExisted() {
            if (this.currentGlobalKfLocation === null) {
                return false;
            }

            const categoryToKfConfigsMap: Record<KfCategoryTypes, KfConfig[]> =
                {
                    td: this.tdList,
                    md: this.mdList,
                    strategy: this.strategyList,
                    system: [],
                };

            const targetKfConfigs: KfConfig[] =
                categoryToKfConfigsMap[this.currentGlobalKfLocation.category];
            if (!targetKfConfigs || !targetKfConfigs.length) {
                return false;
            }

            const afterFilter: KfConfig[] = targetKfConfigs.filter((item) => {
                if (
                    this.currentGlobalKfLocation &&
                    getIdByKfLocation(item) ===
                        getIdByKfLocation(this.currentGlobalKfLocation)
                ) {
                    return true;
                }

                return false;
            });

            return afterFilter.length > 0;
        },

        setKfExtConfigs() {
            return getKfExtensionConfig().then((kfExtConfigs: KfExtConfigs) => {
                this.extConfigs = toRaw(kfExtConfigs);
            });
        },

        markIsBoardDragging(status: boolean) {
            this.isBoardDragging = status;
        },

        initBoardsMap(boardsMap: KfLayout.BoardsMap) {
            this.boardsMap = boardsMap;
        },

        setBoardsMapAttrById(
            id: number,
            attrKey: keyof KfLayout.BoardInfo,
            value: KfLayout.BoardInfo[keyof KfLayout.BoardInfo],
        ) {
            (<typeof value>this.boardsMap[id][attrKey]) = value;
        },

        removeBoardByContentId(targetBoardId: number, targetContentId: string) {
            const targetBoard: KfLayout.BoardInfo =
                this.boardsMap[targetBoardId];
            const contents = targetBoard?.contents;
            const targetIndex = contents?.indexOf(targetContentId);

            if (targetIndex === undefined) return;
            if (targetIndex === -1) return;

            const removedItem: KfLayout.ContentId =
                (contents?.splice(targetIndex, 1) || [])[0] || '';

            if (removedItem === targetBoard.current && contents?.length) {
                targetBoard.current = (targetBoard.contents || [])[0];
            }

            if (!contents?.length && targetBoard.paId != -1) {
                this.removeBoardByBoardId_(targetBoardId);
            }
        },

        removeBoardByBoardId_(targetBoardId: number) {
            const targetBoard = this.boardsMap[targetBoardId];
            if (targetBoard && targetBoard.paId !== -1) {
                const paId = targetBoard.paId;
                const paBoard = this.boardsMap[paId];
                const children = paBoard?.children;
                const childIndex = paBoard.children?.indexOf(targetBoardId);

                if (childIndex === undefined) return;
                if (childIndex === -1) return;

                children?.splice(childIndex, 1);

                if (!children?.length) {
                    this.removeBoardByBoardId_(paId);
                } else {
                    children.forEach((childId: KfLayout.BoardId) => {
                        this.boardsMap[childId].width = 0;
                        this.boardsMap[childId].height = 0;
                    });
                }

                delete this.boardsMap[targetBoardId];
            }
            return;
        },

        setDragedContentData(
            boardId: KfLayout.BoardId,
            contentId: KfLayout.ContentId,
        ) {
            if (boardId === -1 && !contentId) {
                this.dragedContentData = null;
            } else {
                this.dragedContentData = {
                    contentId,
                    boardId,
                };
            }
        },

        afterDragMoveBoard(
            dragedContentData: KfLayout.ContentData | null,
            destBoardId: KfLayout.BoardId,
            directionClassName: KfLayoutTargetDirectionClassName,
        ) {
            const { boardId, contentId } = dragedContentData || {};
            const destBoard = this.boardsMap[destBoardId];

            if (!contentId || boardId === undefined) return;
            if (
                boardId === destBoardId &&
                destBoard.contents &&
                destBoard.contents.length === 1
            )
                return;

            this.removeBoardByContentId(boardId, contentId);

            if (
                directionClassName === KfLayoutTargetDirectionClassName.center
            ) {
                destBoard.contents?.push(contentId);
                destBoard.current = contentId;
            } else if (
                directionClassName != KfLayoutTargetDirectionClassName.unset
            ) {
                this.dragMakeNewBoard_(
                    contentId,
                    destBoardId,
                    directionClassName,
                );
            }
        },

        dragMakeNewBoard_(
            contentId: KfLayout.ContentId,
            destBoardId: number,
            directionClassName: KfLayoutTargetDirectionClassName,
        ) {
            const destBoard = this.boardsMap[destBoardId];
            const destPaId: number = destBoard.paId;
            const destDirection: KfLayoutDirection = destBoard.direction;
            const newBoardId: KfLayout.BoardId = this.buildNewBoardId_();
            const newBoardDirection: KfLayoutDirection =
                directionClassName === KfLayoutTargetDirectionClassName.top ||
                directionClassName === KfLayoutTargetDirectionClassName.bottom
                    ? KfLayoutDirection.h
                    : directionClassName ===
                          KfLayoutTargetDirectionClassName.left ||
                      directionClassName ===
                          KfLayoutTargetDirectionClassName.right
                    ? KfLayoutDirection.v
                    : KfLayoutDirection.unset;
            const newBoardInfo: KfLayout.BoardInfo = {
                paId: destPaId,
                direction: newBoardDirection,
                contents: [contentId],
                current: contentId,
            };

            if (destDirection === newBoardDirection) {
                const siblings = this.boardsMap[destPaId].children;
                const destIndex = siblings?.indexOf(destBoardId);
                if (destIndex === -1 || destIndex === undefined) {
                    throw new Error(
                        "Insert dest board is not in pa board's childen",
                    );
                }

                if (
                    directionClassName ===
                        KfLayoutTargetDirectionClassName.top ||
                    directionClassName === KfLayoutTargetDirectionClassName.left
                ) {
                    siblings?.splice(destIndex, 0, newBoardId);
                } else {
                    siblings?.splice(destIndex + 1, 0, newBoardId);
                }
            } else {
                newBoardInfo.paId = destBoardId;
                const destBoardCopy: KfLayout.BoardInfo = {
                    ...toRaw(destBoard),
                    direction: newBoardDirection,
                    paId: destBoardId,
                };

                const newDestBoardId = newBoardId + 1;
                if (
                    directionClassName ===
                        KfLayoutTargetDirectionClassName.top ||
                    directionClassName === KfLayoutTargetDirectionClassName.left
                ) {
                    destBoard.children = [newBoardId, newDestBoardId];
                } else {
                    destBoard.children = [newDestBoardId, newBoardId];
                }
                delete destBoard.contents;
                delete destBoard.current;
                this.boardsMap[newDestBoardId] = destBoardCopy;
            }

            this.boardsMap[newBoardId] = newBoardInfo;
        },

        buildNewBoardId_(): KfLayout.BoardId {
            const boardIds = Object.keys(this.boardsMap)
                .map((key: string) => +key)
                .sort((key1: number, key2: number) => key2 - key1);
            return boardIds[0] + 1;
        },
    },
});