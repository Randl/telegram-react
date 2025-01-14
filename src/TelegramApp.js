/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import Cookies from 'universal-cookie';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import localForage from 'localforage';
import LocalForageWithGetItems from 'localforage-getitems';
import packageJson from '../package.json';
import withLanguage from './Language';
import withTheme from './Theme';
import withSnackbarNotifications from './Notifications';
import ForwardDialog from './Components/Dialog/ForwardDialog';
import ChatInfo from './Components/ColumnRight/ChatInfo';
import Dialogs from './Components/ColumnLeft/Dialogs';
import DialogDetails from './Components/ColumnMiddle/DialogDetails';
import AuthFormControl from './Components/Auth/AuthFormControl';
import Footer from './Components/Footer';
import MediaViewer from './Components/Viewer/MediaViewer';
import ProfileMediaViewer from './Components/Viewer/ProfileMediaViewer';
import AppInactiveControl from './Components/Additional/AppInactiveControl';
import registerServiceWorker from './registerServiceWorker';
import { highlightMessage } from './Actions/Client';
import { FIRST_START_OPTIMIZATIONS } from './Constants';
import ChatStore from './Stores/ChatStore';
import UserStore from './Stores/UserStore';
import ApplicationStore from './Stores/ApplicationStore';
import TdLibController from './Controllers/TdLibController';
import './TelegramApp.css';

const styles = theme => ({
    page: {
        background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF',
        color: theme.palette.text.primary
    },
    '@global': {
        a: {
            color: theme.palette.primary.main
        },
        code: {
            color: theme.palette.primary.dark
        }
    }
});

class TelegramApp extends Component {
    constructor(props) {
        super(props);

        console.log(`Start Telegram Web ${packageJson.version}`);

        this.dialogDetailsRef = React.createRef();

        this.state = {
            authorizationState: null,
            inactive: false,
            mediaViewerContent: ApplicationStore.mediaViewerContent,
            fatalError: false,
            forwardInfo: null
        };

        /*this.store = localForage.createInstance({
                    name: 'tdlib'
                });*/

        //this.initDB();
    }

    componentWillMount() {
        const { location } = this.props;

        TdLibController.init(location);
    }

    componentDidMount() {
        TdLibController.addListener('update', this.onUpdate);

        UserStore.on('clientUpdateOpenUser', this.onClientUpdateOpenUser);
        ChatStore.on('clientUpdateOpenChat', this.onClientUpdateOpenChat);

        ApplicationStore.on('updateAuthorizationState', this.onUpdateAuthorizationState);
        ApplicationStore.on('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        ApplicationStore.on('clientUpdateMediaViewerContent', this.onClientUpdateMediaViewerContent);
        ApplicationStore.on('clientUpdateProfileMediaViewerContent', this.onClientUpdateProfileMediaViewerContent);
        ApplicationStore.on('clientUpdateAppInactive', this.onClientUpdateAppInactive);
        ApplicationStore.on('updateFatalError', this.onUpdateFatalError);
        ApplicationStore.on('clientUpdateForward', this.onClientUpdateForward);
    }

    componentWillUnmount() {
        TdLibController.removeListener('update', this.onUpdate);

        UserStore.removeListener('clientUpdateOpenUser', this.onClientUpdateOpenUser);
        ChatStore.removeListener('clientUpdateOpenChat', this.onClientUpdateOpenChat);

        ApplicationStore.removeListener('updateAuthorizationState', this.onUpdateAuthorizationState);
        ApplicationStore.removeListener('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        ApplicationStore.removeListener('clientUpdateMediaViewerContent', this.onClientUpdateMediaViewerContent);
        ApplicationStore.removeListener(
            'clientUpdateProfileMediaViewerContent',
            this.onClientUpdateProfileMediaViewerContent
        );
        ApplicationStore.removeListener('clientUpdateAppInactive', this.onClientUpdateAppInactive);
        ApplicationStore.removeListener('updateFatalError', this.onUpdateFatalError);
        ApplicationStore.removeListener('clientUpdateForward', this.onClientUpdateForward);
    }

    onClientUpdateOpenChat = update => {
        const { chatId, messageId, popup } = update;

        this.handleSelectChat(chatId, messageId, popup);
    };

    onClientUpdateOpenUser = update => {
        const { userId, popup } = update;

        this.handleSelectUser(userId, popup);
    };

    onUpdate = update => {
        if (FIRST_START_OPTIMIZATIONS) {
            if (!this.checkServiceWorker) {
                this.checkServiceWorker = true;

                const cookieEnabled = navigator.cookieEnabled;
                if (cookieEnabled) {
                    const cookies = new Cookies();
                    const register = cookies.get('register');
                    if (!register) {
                        registerServiceWorker();
                    }
                }
            }
        }
    };

    onClientUpdateForward = update => {
        const { info } = update;

        this.setState({ forwardInfo: info });
    };

    onUpdateFatalError = update => {
        this.setState({ fatalError: true });
    };

    onUpdateAuthorizationState = update => {
        const { authorization_state } = update;

        this.setState({ authorizationState: authorization_state });

        if (!window.hasFocus) return;
        if (!authorization_state) return;
        if (authorization_state['@type'] !== 'authorizationStateReady') return;

        TdLibController.send({
            '@type': 'setOption',
            name: 'online',
            value: { '@type': 'optionValueBoolean', value: true }
        });
    };

    onClientUpdateChatDetailsVisibility = update => {
        this.setState({
            isChatDetailsVisible: ApplicationStore.isChatDetailsVisible
        });
    };

    onClientUpdateMediaViewerContent = update => {
        this.setState({ mediaViewerContent: ApplicationStore.mediaViewerContent });
    };

    onClientUpdateProfileMediaViewerContent = update => {
        this.setState({
            profileMediaViewerContent: ApplicationStore.profileMediaViewerContent
        });
    };

    onClientUpdateAppInactive = update => {
        this.setState({ inactive: true });
    };

    handleSelectChat = (chatId, messageId = null, popup = false) => {
        const currentChatId = ApplicationStore.getChatId();
        const currentDialogChatId = ApplicationStore.dialogChatId;
        const currentMessageId = ApplicationStore.getMessageId();

        if (popup) {
            if (currentDialogChatId !== chatId) {
                TdLibController.clientUpdate({
                    '@type': 'clientUpdateDialogChatId',
                    chatId
                });
            }

            return;
        }

        if (currentChatId === chatId && messageId && currentMessageId === messageId) {
            this.dialogDetailsRef.current.scrollToMessage();
            if (messageId) {
                highlightMessage(chatId, messageId);
            }
        } else if (currentChatId === chatId && !messageId) {
            const chat = ChatStore.get(chatId);
            if (chat && chat.unread_count > 0) {
                this.dialogDetailsRef.current.scrollToStart();
            } else {
                this.dialogDetailsRef.current.scrollToBottom();
            }
        } else {
            TdLibController.setChatId(chatId, messageId);
        }
    };

    handleSelectUser = async (userId, popup) => {
        if (!userId) return;

        const chat = await TdLibController.send({
            '@type': 'createPrivateChat',
            user_id: userId,
            force: true
        });

        this.handleSelectChat(chat.id, null, popup);
    };

    handleChangePhone = () => {
        this.setState({
            authorizationState: { '@type': 'authorizationStateWaitPhoneNumber' }
        });
    };

    handleDragOver = event => {
        event.preventDefault();
        event.stopPropagation();
    };

    handleDrop = event => {
        event.preventDefault();
        event.stopPropagation();
    };

    handleRefresh = () => {
        this.setState({ fatalError: false });
        window.location.reload();
    };

    handleDestroy = () => {
        this.setState({ fatalError: false });
        TdLibController.send({ '@type': 'destroy' });
    };

    handleKeyDown = event => {
        //console.log('KeyDown', event);
    };

    render() {
        const {
            inactive,
            authorizationState,
            isChatDetailsVisible,
            mediaViewerContent,
            profileMediaViewerContent,
            fatalError,
            forwardInfo
        } = this.state;
        const { classes } = this.props;

        let page = (
            <>
                <div className={classNames(classes.page, 'page', { 'page-third-column': isChatDetailsVisible })}>
                    <Dialogs onClearCache={this.clearCache} onSelectChat={this.handleSelectChat} />
                    <DialogDetails ref={this.dialogDetailsRef} />
                    {isChatDetailsVisible && <ChatInfo />}
                </div>
                <Footer />
            </>
        );

        if (inactive) {
            page = (
                <>
                    <div className='header-wrapper' />
                    <div className={classNames(classes.page, 'page')}>
                        <AppInactiveControl />
                    </div>
                    <Footer />
                </>
            );
        } else if (authorizationState) {
            switch (authorizationState['@type']) {
                case 'authorizationStateClosed': {
                    break;
                }
                case 'authorizationStateClosing': {
                    break;
                }
                case 'authorizationStateLoggingOut': {
                    break;
                }
                case 'authorizationStateReady': {
                    break;
                }
                case 'authorizationStateWaitCode':
                case 'authorizationStateWaitPassword':
                case 'authorizationStateWaitPhoneNumber':
                    page = (
                        <AuthFormControl
                            authorizationState={authorizationState}
                            onChangePhone={this.handleChangePhone}
                        />
                    );
                    break;
                case 'authorizationStateWaitEncryptionKey': {
                    break;
                }
                case 'authorizationStateWaitTdlibParameters': {
                    break;
                }
            }
        }

        return (
            <div id='app' onDragOver={this.handleDragOver} onDrop={this.handleDrop} onKeyDown={this.handleKeyDown}>
                {page}
                {mediaViewerContent && <MediaViewer {...mediaViewerContent} />}
                {profileMediaViewerContent && <ProfileMediaViewer {...profileMediaViewerContent} />}
                <Dialog
                    transitionDuration={0}
                    open={fatalError}
                    onClose={this.handleRefresh}
                    aria-labelledby='fatal-error-dialog-title'
                    aria-describedby='fatal-error-dialog-description'>
                    <DialogTitle id='fatal-error-dialog-title'>Telegram</DialogTitle>
                    <DialogContent>
                        <DialogContentText id='fatal-error-dialog-description'>
                            Oops! Something went wrong. We need to refresh this page.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleDestroy} color='primary'>
                            Log out
                        </Button>
                        <Button onClick={this.handleRefresh} color='primary' autoFocus>
                            Refresh
                        </Button>
                    </DialogActions>
                </Dialog>
                {forwardInfo && <ForwardDialog {...forwardInfo} />}
            </div>
        );
    }
}

const keyMap = new Map();
window.keyMap = keyMap;

async function openPinnedChat(index) {
    const chats = await TdLibController.send({
        '@type': 'getChats',
        offset_order: '9223372036854775807',
        offset_chat_id: 0,
        limit: 10
    });

    if (chats) {
        let pinnedIndex = -1;
        for (let i = 0; i < chats.chat_ids.length; i++) {
            const chat = ChatStore.get(chats.chat_ids[i]);
            if (chat && chat.is_pinned) {
                pinnedIndex++;
            }

            if (pinnedIndex === index) {
                TdLibController.setChatId(chat.id);
                return;
            }
        }
    }
}

document.addEventListener('keyup', event => {
    keyMap.delete(event.key);
    //console.log('keyup key=' + event.key, keyMap);
});

document.addEventListener('keydown', async event => {
    keyMap.set(event.key, event.key);
    //console.log('keydown key=' + event.key, event.altKey, event.ctrlKey, event, keyMap);

    const { authorizationState } = ApplicationStore;
    if (!authorizationState) return;
    if (authorizationState['@type'] !== 'authorizationStateReady') return;
    if (keyMap.size > 3) return;

    if (event.altKey && event.ctrlKey) {
        switch (event.key) {
            case '0': {
                event.preventDefault();
                event.stopPropagation();

                const chat = await TdLibController.send({
                    '@type': 'createPrivateChat',
                    user_id: UserStore.getMyId(),
                    force: true
                });

                if (chat) {
                    TdLibController.setChatId(chat.id);
                }
                break;
            }
            case '1': {
                event.preventDefault();
                event.stopPropagation();

                openPinnedChat(0);
                break;
            }
            case '2': {
                event.preventDefault();
                event.stopPropagation();

                openPinnedChat(1);
                break;
            }
            case '3': {
                event.preventDefault();
                event.stopPropagation();

                openPinnedChat(2);
                break;
            }
            case '4': {
                event.preventDefault();
                event.stopPropagation();

                openPinnedChat(3);
                break;
            }
            case '5': {
                event.preventDefault();
                event.stopPropagation();

                openPinnedChat(4);
                break;
            }
        }
    }
});

window.hasFocus = true;

// set offline on page lost focus
window.onblur = function() {
    keyMap.clear();
    //console.log('window.blur key', keyMap);

    const { authorizationState } = ApplicationStore;

    if (!authorizationState) return;
    if (authorizationState['@type'] !== 'authorizationStateReady') return;

    window.hasFocus = false;

    TdLibController.clientUpdate({
        '@type': 'clientUpdateFocusWindow',
        focused: false
    });
};

// set online on page get focus
window.onfocus = function() {
    keyMap.clear();
    //console.log('window.focus key', keyMap);
    const { authorizationState } = ApplicationStore;

    if (!authorizationState) return;
    if (authorizationState['@type'] !== 'authorizationStateReady') return;

    window.hasFocus = true;

    TdLibController.clientUpdate({
        '@type': 'clientUpdateFocusWindow',
        focused: true
    });
};

// disable back navigation
window.history.pushState(null, null, window.location.href);
window.onpopstate = function() {
    window.history.go(1);
};

const enhance = compose(
    withLanguage,
    withTheme,
    withStyles(styles),
    withSnackbarNotifications
);

export default enhance(TelegramApp);
