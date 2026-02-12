import './GamePage.css'
import Header from '../components/Header.jsx'
import React, { useState, useEffect, useRef } from "react";


function GamePage({ header_info }) {


    return (
        <> 
            <main className="home_main_page">
                <Header header_info={header_info} title="Home" />    
            </main>
            
        </>
    );
}

export default GamePage;

