import "./Header.css"



function Header({ header_info, title = "Home"}) {
  const info = header_info[title] ?? header_info.Home;
  return (
    <>
        <header>
        {info.type == 1 ? (
          <img src="img/header/header_background.png" alt="header background image" />
        ):(
          <img src="img/header/header_background_empty.png" alt="header background image" />
        )}
          

          {info.type == 1 ? (
            <div className="header_container">
              <div className="header_edges">
                <p>{info.left.value}</p>
              </div>
              <div className="header_middle">
                <h3>{info.middle.header}</h3>
                <p>{info.middle.score}</p>
              </div>
              <div className="header_edges">
                <p>{info.right.value}</p>
              </div>
            </div>
          ) : (
            <div className="header_container">
              <h2>{info.header}</h2>
            </div>
            
          ) }

        </header>

    </>
  );
}

export default Header