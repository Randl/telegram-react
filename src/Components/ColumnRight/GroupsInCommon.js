/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import ListItem from '@material-ui/core/ListItem';
import ChatControl from '../Tile/ChatControl';
import GroupsInCommonHeader from './GroupsInCommonHeader';
import { getChatUserId } from '../../Utils/Chat';
import { loadChatsContent } from '../../Utils/File';
import { openChat } from '../../Actions/Client';
import FileStore from '../../Stores/FileStore';
import TdLibController from '../../Controllers/TdLibController';
import './GroupsInCommon.css';

class GroupsInCommon extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            chatIds: []
        };
    }

    componentDidMount() {
        const { chatId } = this.props;

        const userId = getChatUserId(chatId);
        if (!userId) return;

        TdLibController.send({
            '@type': 'getGroupsInCommon',
            user_id: userId,
            offset_chat_id: 0,
            limit: 100
        }).then(result => {
            const store = FileStore.getStore();
            loadChatsContent(store, result.chat_ids);

            this.setState({ chatIds: result.chat_ids });
        });
    }

    handleSelect = chat => {
        const { popup } = this.props;

        openChat(chat.id);

        if (popup) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateDialogChatId',
                chatId: 0
            });
        }
    };

    render() {
        const { onClose, popup } = this.props;
        const { chatIds } = this.state;

        const chats = chatIds.map(x => (
            <ListItem button key={x}>
                <ChatControl chatId={x} onSelect={this.handleSelect} />
            </ListItem>
        ));

        const content = (
            <>
                <GroupsInCommonHeader onClose={onClose} />
                <div className='groups-in-common-list'>{chats}</div>
            </>
        );

        return popup ? <>{content}</> : <div className='groups-in-common'>{content}</div>;
    }
}

GroupsInCommon.propTypes = {
    chatId: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    popup: PropTypes.bool
};

GroupsInCommon.defaultProps = {
    popup: false
};

export default GroupsInCommon;
