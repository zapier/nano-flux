import React from 'react';

const exists = (obj) => {
  return obj !== null && typeof obj !== 'undefined';
};

export default (Component, actionsKeys, actionsFn) => {

  const checkFluxProp = (props) => {
    if (!exists(props.flux)) {
      throw new Error('Must pass flux object on props for injectActions.');
    }
    if (typeof props.flux.stores !== 'object') {
      throw new Error('Flux object must have stores.');
    }
  };

  const actionsFromKeys = (props) => {
    checkFluxProp(props);

    const actions = {};
    actionsKeys.forEach((actionsKey) => {
      actions[actionsKey] = props.flux.actions[actionsKey];
    });
    return actions;
  };

  const InjectActions = class extends React.Component {

    constructor(props, context) {
      super(props, context);

      const actionsByKey = actionsFromKeys(props);

      const actions = actionsFn(actionsByKey);

      this.state = {
        actions
      };
    }

    render() {
      return <Component {...this.props} {...this.state.actions}/>;
    }

  };

  return InjectActions;
};
