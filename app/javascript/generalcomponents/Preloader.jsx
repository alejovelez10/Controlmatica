import React, { Component } from 'react';

class Preloader extends Component {
    render() {
        return (
            <React.Fragment>
                <div className="container">
                    <ul>
                        <li></li>
                        <li></li>
                        <li></li>
                        <li></li>
                        <li></li>
                    </ul>
                </div>
            </React.Fragment>
        );
    }
}

export default Preloader;