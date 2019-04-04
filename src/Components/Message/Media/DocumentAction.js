/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { getDownloadedSize, getUploadedSize, getFileSize } from '../../../Utils/File';
import FileStore from '../../../Stores/FileStore';
import './DocumentAction.css';

class DocumentAction extends React.Component {
    constructor(props) {
        super(props);

        const { file } = this.props;
        this.state = {
            prevPropsFile: file,
            prevFile: null,
            file: FileStore.get(file.id) || file
        };
    }

    componentDidMount() {
        FileStore.on('updateFile', this.onUpdateFile);
    }

    componentWillUnmount() {
        FileStore.removeListener('updateFile', this.onUpdateFile);
    }

    onUpdateFile = update => {
        const currentFile = this.state.file;
        const nextFile = update.file;

        if (currentFile && currentFile.id === nextFile.id) {
            this.setState({ file: nextFile, prevFile: currentFile });
        }
    };

    static getDerivedStateFromProps(props, state) {
        const { file } = props;
        const { prevPropsFile } = state;

        if (file && prevPropsFile && file.id !== prevPropsFile.id) {
            return {
                prevPropsFile: file,
                prevFile: null,
                file: FileStore.get(file.id) || file
            };
        }

        return null;
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (nextState.file !== this.state.file) {
            return true;
        }

        if (nextState.prevFile !== this.state.prevFile) {
            return true;
        }

        return false;
    }

    render() {
        const { t, openMedia } = this.props;
        const { file } = this.state;
        if (!file) return null;

        let isDownloadingActive = file.local && file.local.is_downloading_active;
        let isUploadingActive = file.remote && file.remote.is_uploading_active;
        let isDownloadingCompleted = file.local && file.local.is_downloading_completed;
        let isUploadingCompleted = file.remote && file.remote.is_uploading_completed;

        let size = getFileSize(file);
        let progressSize = null;
        if (isDownloadingActive) {
            progressSize = getDownloadedSize(file);
        } else if (isUploadingActive) {
            progressSize = getUploadedSize(file);
        }

        let sizeString = progressSize ? `${progressSize}/${size}` : `${size}`;
        let action =
            isDownloadingActive || isUploadingActive
                ? t('Cancel')
                : isDownloadingCompleted || file.idb_key
                ? t('Save')
                : '';

        return (
            <div className='document-action'>
                <span className='document-size'>{`${sizeString} `}</span>
                {action && <a onClick={openMedia}>{action}</a>}
            </div>
        );
    }
}

DocumentAction.propTypes = {
    file: PropTypes.object.isRequired,
    openMedia: PropTypes.func.isRequired
};

export default withTranslation()(DocumentAction);