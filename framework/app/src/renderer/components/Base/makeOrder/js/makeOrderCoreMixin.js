import { mapState, mapGetters } from 'vuex';

import { kungfuCancelOrder, kungfuMakeOrder, kungfuSubscribeInstrument } from '__io/kungfu/makeCancelOrder';
import { decodeKungfuLocation } from '__io/kungfu/watcher';

export default {

    computed: {
        ...mapState({
            tdAccountSource: state => state.BASE.tdAccountSource || {},
            strategyList: state => state.STRATEGY.strategyList || [],
            tdList: state => state.ACCOUNT.tdList || [],
            accountsAsset: state => state.ACCOUNT.accountsAsset || {},          
            processStatus: state => state.BASE.processStatus || {}
        })
    },

    methods: {
        cancelOrder (moduleType, orderData, strategyId) {
            const kungfuLocation = decodeKungfuLocation(+orderData.source);
            const accountId = `${kungfuLocation.group}_${kungfuLocation.name}`;

            //撤单   
            if (moduleType === 'strategy') {
                return kungfuCancelOrder( orderData.orderId, accountId, strategyId)
            } else if (moduleType === 'account') {
                return kungfuCancelOrder( orderData.orderId, accountId)
            }
        },

        makeOrder (moduleType, makeOrderForm, currentAccountResolved, strategyId, parentId) {
            if (moduleType === 'account') {
                return kungfuMakeOrder(makeOrderForm, currentAccountResolved)
            } else if (moduleType === 'strategy') {
                return kungfuMakeOrder(makeOrderForm, currentAccountResolved, strategyId)
            } else if (moduleType === 'ticker') {
                return kungfuMakeOrder(makeOrderForm, currentAccountResolved)
            }
        },

        subscribeTicker (sourceName, exchangeId, ticker) {
            if (checkAllMdProcess.call(this, [{ 
                source: sourceName,
                exchangeId,
                instrumentId: ticker
            }, this.processStatus])) {
                return kungfuSubscribeInstrument(sourceName, exchangeId, ticker)
            } else {
                return Promise.resolve(false)
            }
        }
    }

}