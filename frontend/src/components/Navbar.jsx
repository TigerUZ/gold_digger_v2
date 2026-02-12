import './Navbar.css';
import React from 'react';
import { NavLink } from 'react-router-dom';
import icons from "./../assets/icons_png.json";

function Navbar() {



  return (
    <nav className="nav-container">
      <img className="nav_container_background" src="img/navbar/navbar_background.png" alt="navbar_background image" />
      
      <div className="navbar_button_container">
      {icons.navbar.map((icon) => (
        <NavLink
          className="nav-link"
          key={icon.name}
          to={icon.link}
          style={{ textDecoration: "none" }}
        >
          <img src={icon.url} alt={icon.name}/>
        </NavLink>
      ))}
      </div>
      
    </nav>
  );
}

export default Navbar;
