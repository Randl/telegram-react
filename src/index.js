/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import TelegramApp from './TelegramApp';
import registerServiceWorker from './registerServiceWorker';
import Cookies from 'universal-cookie';
import { FIRST_START_OPTIMIZATIONS } from './Constants';
import './index.css';

ReactDOM.render(
    <Router>
        <Route path='' component={TelegramApp} />
    </Router>,
    document.getElementById('root')
);

if (FIRST_START_OPTIMIZATIONS) {
    const cookieEnabled = navigator.cookieEnabled;
    if (cookieEnabled) {
        const cookies = new Cookies();
        const register = cookies.get('register');
        if (register) {
            registerServiceWorker();
        }
    } else {
        registerServiceWorker();
    }
} else {
    registerServiceWorker();
}
