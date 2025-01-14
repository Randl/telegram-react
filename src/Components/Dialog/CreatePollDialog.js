/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import { withTranslation } from 'react-i18next';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import CreatePollOption from './CreatePollOption';
import { focusNode } from '../../Utils/Component';
import { withRestoreRef, withSaveRef } from '../../Utils/HOC';
import { utils } from '../../Utils/Key';
import { hasPollData, isValidPoll } from '../../Utils/Poll';
import {
    POLL_OPTIONS_MAX_COUNT,
    POLL_QUESTION_HINT_LENGTH,
    POLL_QUESTION_LENGTH,
    POLL_QUESTION_MAX_LENGTH
} from '../../Constants';
import PollStore from '../../Stores/PollStore';
import TdLibController from '../../Controllers/TdLibController';
import './CreatePollDialog.css';

const styles = theme => ({
    dialogRoot: {
        color: theme.palette.text.primary
    },
    contentRoot: {
        width: 300
    },
    dividerRoot: {
        margin: '8px -24px'
    },
    listRoot: {
        margin: '0 -24px'
    },
    listItem: {
        padding: '11px 24px',
        color: '#8e9396',
        height: 48
    },
    typographyRoot: {}
});

class CreatePollDialog extends React.Component {
    constructor(props) {
        super(props);

        this.questionRef = React.createRef();
        this.optionsRefMap = new Map();

        this.state = {
            poll: null,
            confirm: false,
            remainLength: POLL_QUESTION_MAX_LENGTH
        };
    }

    componentDidMount() {
        PollStore.on('clientUpdateDeletePoll', this.handleClientUpdatePoll);
        PollStore.on('clientUpdateDeletePollOption', this.handleClientUpdatePoll);
        PollStore.on('clientUpdateNewPoll', this.handleClientUpdateNewPoll);
        PollStore.on('clientUpdateNewPollOption', this.handleClientUpdateNewPollOption);
        PollStore.on('clientUpdatePollOption', this.handleClientUpdatePoll);
        PollStore.on('clientUpdatePollQuestion', this.handleClientUpdatePollQuestion);
    }

    componentWillUnmount() {
        PollStore.removeListener('clientUpdateDeletePoll', this.handleClientUpdatePoll);
        PollStore.removeListener('clientUpdateDeletePollOption', this.handleClientUpdatePoll);
        PollStore.removeListener('clientUpdateNewPoll', this.handleClientUpdateNewPoll);
        PollStore.removeListener('clientUpdateNewPollOption', this.handleClientUpdateNewPollOption);
        PollStore.removeListener('clientUpdatePollOption', this.handleClientUpdatePoll);
        PollStore.removeListener('clientUpdatePollQuestion', this.handleClientUpdatePollQuestion);
    }

    handleClientUpdateNewPoll = update => {
        const { poll } = PollStore;

        this.setState({
            confirm: false,
            remainLength: POLL_QUESTION_MAX_LENGTH,
            poll
        });
    };

    handleClientUpdatePollQuestion = update => {
        const { poll } = PollStore;

        const node = this.questionRef.current;
        const length = node.dataset.length;
        const innerText = node.innerText;

        this.setState({
            remainLength: length - innerText.length,
            poll
        });
    };

    handleClientUpdatePoll = update => {
        const { poll } = PollStore;

        this.setState({ poll });
    };

    handleClientUpdateNewPollOption = update => {
        const { poll } = PollStore;

        this.setState({ poll }, () => {
            setTimeout(() => {
                const node = this.optionsRefMap.get(poll.options.length - 1);

                node.focus(true);
            });
        });
    };

    componentDidUpdate(prevProps, prevState, snapshot) {
        const { poll } = this.state;

        if (poll && !prevState.poll) {
            setTimeout(() => {
                focusNode(this.questionRef.current, true);
            }, 0);
        }
    }

    handleKeyDown = event => {
        const node = this.questionRef.current;
        const maxLength = node.dataset.maxLength;
        const innerText = node.innerText;
        const length = innerText.length;

        let hasSelection = false;
        const selection = window.getSelection();
        const isSpecial = utils.isSpecial(event);
        const isNavigational = utils.isNavigational(event);

        if (selection) {
            hasSelection = !!selection.toString();
        }

        switch (event.key) {
            case 'Enter': {
                if (!event.shiftKey) {
                    this.handleFocusNextOption(0);

                    event.preventDefault();
                    return false;
                }

                break;
            }
            case 'ArrowDown': {
                const selection = window.getSelection();
                if (!selection) break;
                if (!selection.isCollapsed) break;

                const lastChild =
                    node.childNodes && node.childNodes.length > 0 ? node.childNodes[node.childNodes.length - 1] : null;

                if (!lastChild || (selection.anchorNode === lastChild && selection.anchorOffset === lastChild.length)) {
                    this.handleFocusNextOption(0);

                    event.preventDefault();
                    return false;
                }

                break;
            }
        }

        if (isSpecial || isNavigational) {
            return true;
        }

        if (length >= maxLength && !hasSelection) {
            event.preventDefault();
            return false;
        }

        return true;
    };

    handlePaste = event => {
        event.preventDefault();

        const node = this.questionRef.current;
        const maxLength = node.dataset.maxLength;

        const selection = window.getSelection();
        const selectionString = selection ? selection.toString() : '';

        const innerText = node.innerText;
        if (innerText.length - selection.length >= maxLength) return;

        let pasteText = event.clipboardData.getData('text/plain');
        if (!pasteText) return;

        if (innerText.length - selectionString.length + pasteText.length > maxLength) {
            pasteText = pasteText.substr(0, maxLength - innerText.length + selectionString.length);
        }
        document.execCommand('insertHTML', false, pasteText);
    };

    handleInput = event => {
        event.preventDefault();

        const node = this.questionRef.current;
        //const length = node.dataset.length;

        const innerText = node.innerText;
        const innerHtml = node.innerHTML;

        if (innerHtml === '<br>') {
            node.innerText = '';
        }

        // this.setState({
        //     remainLength: length - innerText.length
        // });

        TdLibController.clientUpdate({
            '@type': 'clientUpdatePollQuestion',
            question: innerText
        });
    };

    handleAddOption = () => {
        const { poll } = this.state;
        if (!poll) return;

        const { options } = poll;
        if (options.length >= POLL_OPTIONS_MAX_COUNT) return;

        const option = {
            id: Date.now(),
            text: ''
        };

        TdLibController.clientUpdate({
            '@type': 'clientUpdateNewPollOption',
            option
        });
    };

    handleDeleteOption = (id, backspace = false) => {
        if (backspace) {
            this.handleDeleteByBackspace(id);
        } else {
            this.handleDelete(id);
        }
    };

    handleDelete = id => {
        TdLibController.clientUpdate({
            '@type': 'clientUpdateDeletePollOption',
            id
        });
    };

    handleDeleteByBackspace = id => {
        const { poll } = this.state;
        if (!poll) return;

        const { options } = poll;

        const index = options.findIndex(x => x.id === id);
        const prevIndex = index - 1;
        let deleteOption = true;
        for (let i = index; i < options.length; i++) {
            const { text } = options[i];
            if (text) {
                deleteOption = false;
                break;
            }
        }

        if (deleteOption) {
            this.handleDeleteOption(id);
        }

        const prevNode = this.optionsRefMap.get(prevIndex);
        if (!prevNode) {
            const element = this.questionRef.current;

            focusNode(element, true);
            return;
        }

        prevNode.focus(true);
    };

    handleFocusPrevOption = id => {
        const { poll } = this.state;
        if (!poll) return;

        const { options } = poll;

        const index = options.findIndex(x => x.id === id);
        const prevIndex = index - 1;

        const prevNode = this.optionsRefMap.get(prevIndex);
        if (!prevNode) {
            const element = this.questionRef.current;

            focusNode(element, false);
            return;
        }

        prevNode.focus(false);
    };

    handleFocusNextOption = id => {
        const { poll } = this.state;
        if (!poll) return;

        const { options } = poll;

        const index = options.findIndex(x => x.id === id);
        const nextIndex = index + 1;

        const nextNode = this.optionsRefMap.get(nextIndex);
        if (!nextNode) {
            const text = index >= 0 && index < options.length ? options[index].text : '';
            if (options.length && !text) {
                return;
            }

            this.handleAddOption();
            return;
        }

        nextNode.focus(nextNode, true);
    };

    getHint = () => {
        const { poll } = this.state;
        if (!poll) return;

        const { options } = poll;

        const addCount = POLL_OPTIONS_MAX_COUNT - options.length;

        if (addCount <= 0) {
            return 'You have added the maximum number of options.';
        }
        if (addCount === 1) {
            return 'You can add 1 more option.';
        }

        return `You can add ${POLL_OPTIONS_MAX_COUNT - options.length} more options.`;
    };

    handleClose = () => {
        const { poll } = this.state;

        if (hasPollData(poll)) {
            this.setState({ confirm: true });
        } else {
            this.handleConfirmationDone();
        }
    };

    handleSend = () => {
        const { onSend } = this.props;

        const inputMessagePoll = PollStore.getInputMessagePoll();
        if (!inputMessagePoll) return;

        onSend(inputMessagePoll);

        this.handleConfirmationDone();
    };

    handleConfirmationClose = () => {
        this.setState({ confirm: false });
    };

    handleConfirmationDone = () => {
        this.handleConfirmationClose();

        TdLibController.clientUpdate({
            '@type': 'clientUpdateDeletePoll'
        });
    };

    render() {
        const { classes, t } = this.props;
        const { remainLength, confirm, poll } = this.state;
        if (!poll) return null;

        const options = poll ? poll.options : [];

        this.optionsRefMap.clear();
        const items = options.map((x, i) => (
            <CreatePollOption
                ref={el => this.optionsRefMap.set(i, el)}
                key={x.id}
                option={x}
                onDelete={this.handleDeleteOption}
                onFocusPrev={this.handleFocusPrevOption}
                onFocusNext={this.handleFocusNextOption}
            />
        ));

        const canAddOption = POLL_OPTIONS_MAX_COUNT - options.length > 0;
        const hint = this.getHint();

        return (
            <>
                <Dialog
                    className={classes.dialogRoot}
                    open
                    transitionDuration={0}
                    onClose={this.handleClose}
                    aria-labelledby='dialog-title'>
                    <DialogTitle id='dialog-title'>{t('NewPoll')}</DialogTitle>
                    <DialogContent classes={{ root: classes.contentRoot }}>
                        <div className='create-poll-dialog-question-title'>
                            <Typography color='primary' variant='subtitle1' style={{ flexGrow: 1 }}>
                                {t('Question')}
                            </Typography>
                            {remainLength <= POLL_QUESTION_LENGTH - POLL_QUESTION_HINT_LENGTH && (
                                <Typography color={remainLength >= 0 ? 'textSecondary' : 'error'} variant='subtitle1'>
                                    {remainLength}
                                </Typography>
                            )}
                        </div>
                        <div
                            ref={this.questionRef}
                            id='create-poll-dialog-question'
                            contentEditable
                            suppressContentEditableWarning
                            placeholder={t('QuestionHint')}
                            data-length={POLL_QUESTION_LENGTH}
                            data-max-length={POLL_QUESTION_MAX_LENGTH}
                            onPaste={this.handlePaste}
                            onKeyDown={this.handleKeyDown}
                            onInput={this.handleInput}
                        />
                        <Divider className={classes.dividerRoot} />
                        <Typography color='primary' variant='subtitle1'>
                            {t('PollOptions')}
                        </Typography>
                        <List classes={{ root: classes.listRoot }}>
                            {items}
                            {canAddOption && (
                                <ListItem
                                    selected={false}
                                    className={classes.listItem}
                                    button
                                    onClick={this.handleAddOption}>
                                    <ListItemText disableTypography primary={t('AddAnOption')} />
                                </ListItem>
                            )}
                        </List>
                        <Typography>{hint}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button color='primary' onClick={this.handleClose}>
                            {t('Cancel')}
                        </Button>
                        {isValidPoll(poll) && (
                            <Button color='primary' onClick={this.handleSend}>
                                {t('Send')}
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>
                <Dialog
                    className={classes.dialogRoot}
                    open={confirm}
                    transitionDuration={0}
                    onClose={this.handleConfirmationClose}
                    aria-labelledby='dialog-title'>
                    <DialogTitle id='dialog-title'>{t('CancelPollAlertTitle')}</DialogTitle>
                    <DialogContent classes={{ root: classes.contentRoot }}>{t('CancelPollAlertText')}</DialogContent>
                    <DialogActions>
                        <Button color='primary' onClick={this.handleConfirmationClose}>
                            {t('Cancel')}
                        </Button>
                        <Button color='primary' onClick={this.handleConfirmationDone}>
                            {t('Ok')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

CreatePollDialog.propTypes = {
    onSend: PropTypes.func.isRequired
};

const enhance = compose(
    withSaveRef(),
    withStyles(styles),
    withTranslation(),
    withRestoreRef()
);

export default enhance(CreatePollDialog);
