'use strict';
const Storage=(()=>{
  const KEY='financialModelCalculator.brazil.v1';
  function save(state){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_e){}}
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_e){return null}}
  return{save,load};
})();
