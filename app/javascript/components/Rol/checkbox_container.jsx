import React from "react";

class CheckboxContainer extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <div className="row">
          {this.props.modules.map(modulex => (
            <div className="col-md-3" style={{marginBottom:"30px"}}>
              <h4 key={modulex.id}>{modulex.name}</h4>

              {modulex.accion_modules.map(item => (
                <div>
                  <label key={item.id}>
                  

                    <input
                      style={{marginRight:"10px"}}
                      type="checkbox"
                      value={item.id}
                      checked={this.props.checkedItems.get(item.id.toString())}
                      onChange={this.props.handleChangeAccions}
                    />  {item.name}
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </React.Fragment>
    );
  }
}

export default CheckboxContainer;
