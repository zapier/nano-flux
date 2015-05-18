import React from 'react';

const exists = (obj) => {
  return obj !== null && typeof obj !== 'undefined';
};

export default (Component, storeKeys, stateFn) => {

  const checkFluxProp = (props) => {
    if (!exists(props.flux)) {
      throw new Error('Must pass flux object on props for connectToStores.');
    }
    if (typeof props.flux.stores !== 'object') {
      throw new Error('Flux object must have stores.');
    }
  };

  const storesFromKeys = (props) => {
    checkFluxProp(props);

    const stores = {};
    storeKeys.forEach((storeKey) => {
      stores[storeKey] = props.flux.stores[storeKey];
    });
    return stores;
  };

  const ConnectToStores = class extends React.Component {

    constructor(props, context) {
      super(props, context);

      const stores = storesFromKeys(props);

      this.state = {
        stores: stores,
        props: stateFn(stores, props)
      };

      this.onStoreChanged = this.onStoreChanged.bind(this);
    }

    componentDidMount() {
      storeKeys.forEach((storeKey) => {
        this.state.stores[storeKey].on('change', this.onStoreChanged);
      });
    }

    onStoreChanged() {
      this.setState({
        props: stateFn(this.state.stores, this.props)
      });
    }

    componentWillUnmount() {
      storeKeys.forEach((storeKey) => {
        const store = this.state.stores[storeKey];
        store.off('change', this.onStoreChanged);
      });
    }

    render() {
      return <Component {...this.props} {...this.state.props}/>;
    }

  };

  return ConnectToStores;
};
