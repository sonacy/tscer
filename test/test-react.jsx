import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

@errorBoundary()
@Format.inject
@connect(
  (state, props) => {
    const { app, global, info, list, curItem } = state

    return {
      curApp: list[props.id],
      app,
      curItem,
      total: info.total,
      name: global.name,
    }
  },
  dispatch =>
    bindActionCreators(
      {
        save,
        update,
        remove,
      },
      dispatch
    )
)
export default class Test extends Component {
  static propTypes = {
    obj: PropTypes.object,
    isBool: PropTypes.bool,
    str: PropTypes.string,
    arr: PropTypes.array,
    oneOfType: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    node: PropTypes.node,
    oneOf: PropTypes.oneOf(['a', 'b', 'c', 'd']),
    func: PropTypes.func,
    required: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      isShowModal: false,
      modalName: props.report_name || '',
      modalType: 'save',
      confirmLoading: false,
      monitorModalVisible: false,
    }
    this.aaa = '111'
  }

  render() {
    return <div>hello tscer</div>
  }
}
