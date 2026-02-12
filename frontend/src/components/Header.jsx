import "./Header.css"



function Header({ header_info, title = "Home"}) {
  return (
    <>
        <header>
        {header_info[title].type == 1 ? (
          <img src="img/header/header_background.png" alt="header background image" />
        ):(
          <img src="img/header/header_background_empty.png" alt="header background image" />
        )}
          

          {header_info[title].type == 1 ? (
            <div className="header_container">
              <div className="header_edges">
                <p>{header_info[title].left.value}</p>
              </div>
              <div className="header_middle">
                <h3>{header_info[title].middle.header}</h3>
                <p>{header_info[title].middle.score}</p>
              </div>
              <div className="header_edges">
                <p>{header_info[title].right.value}</p>
              </div>
            </div>
          ) : (
            <div className="header_container">
              <h2>{header_info[title].header}</h2>
            </div>
            
          ) }

        </header>

    </>
  );
}

export default Header