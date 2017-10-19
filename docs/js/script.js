(function() {
  var qs = document.location.search.split(/[?&]/).map(
    function(elm) {
      var n = elm.split(/=/);
      return {
        name: n[0],
        value: n[1]
      };
    }
  );
  qs.some(function(query) {
    if (query.name === 'code') {
      document.querySelector('#code').innerHTML = query.value;
      return true;
    }
    return false;
  });
})();