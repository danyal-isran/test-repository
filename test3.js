(async function initDDCAdapter(WIAPI, dataLayer) {
  const API = new WIAPI('prodigy-api');
  const r = await API.utils.getDealerData();
  console.log(r);
  console.log(dataLayer.dealership);
})(window.DDC.API, window.DDC.dataLayer);
