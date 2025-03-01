/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EventEmitter } from 'events';
import TdLibController from '../Controllers/TdLibController';

class StickerStore extends EventEmitter {
    constructor() {
        super();

        this.stickerSet = null;

        this.addTdLibListener();
        this.setMaxListeners(Infinity);
    }

    onUpdate = update => {
        switch (update['@type']) {
            case 'updateInstalledStickerSets': {
                const { sticker_set_ids } = update;
                if (this.stickerSet) {
                    const { id, is_installed } = this.stickerSet;
                    if (is_installed !== sticker_set_ids.some(x => x === id)) {
                        this.assign(this.stickerSet, { is_installed: !is_installed });
                    }
                }

                this.emit('updateInstalledStickerSets', update);
                break;
            }
            default:
                break;
        }
    };

    onClientUpdate = update => {
        switch (update['@type']) {
            case 'clientUpdateStickerSet': {
                const { stickerSet } = update;

                this.set(stickerSet);

                this.emit('clientUpdateStickerSet', update);
                break;
            }
            default:
                break;
        }
    };

    addTdLibListener = () => {
        TdLibController.addListener('update', this.onUpdate);
        TdLibController.addListener('clientUpdate', this.onClientUpdate);
    };

    removeTdLibListener = () => {
        TdLibController.removeListener('update', this.onUpdate);
        TdLibController.removeListener('clientUpdate', this.onClientUpdate);
    };

    assign(source1, source2) {
        this.set(Object.assign({}, source1, source2));
    }

    set(stickerSet) {
        this.stickerSet = stickerSet;
    }
}

const store = new StickerStore();
window.sticker = store;
export default store;
