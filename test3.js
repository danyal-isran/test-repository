/* eslint-disable no-shadow */
/* eslint-disable no-undef */
import moment from 'moment';
import styles from './style.scss';

const BUTTON_TYPES = {
  SRP: 'SRP',
  VDP: 'VDP',
  API: 'API',
};
const PRICING_BUTTON_GROUP_TYPES = [BUTTON_TYPES.SRP, BUTTON_TYPES.VDP, BUTTON_TYPES.API];
const PRICING_BUTTON_GROUP_VIN_ATTR = 'vin';
const PRICING_BUTTON_GROUP_CONFIGTYPE_ATTR = 'config-type';
const PRICING_BUTTON_GROUP_SELECTOR = '.prodigy-pricing-button-group';

const STANDALONE_TRADEIN_BUTTON_SELECTOR = '.prodigy-standalone-tradein-button';
const STANDALONE_PREAPPROVAL_BUTTON_SELECTOR = '.prodigy-standalone-preapproval-button';
const STANDALONE_BROWSE_BUTTON_SELECTOR = '.prodigy-standalone-browse-button';

const SOURCE = 'dealerwebsite';
const DEALER_HOSTS = {
  DEFAULT: 'default',
  DEALER_INSPIRE: 'dealerinspire',
};
const TRANSFER_QUERY_PARAMS = [
  // Google analytics variables
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

const referrerDomain = window.location.hostname;

let DEALER_HOST = DEALER_HOSTS.DEFAULT;

// Localize jQuery variable
let jQuery;

// The script tag of the Prodigy Agent Script
let scriptTag;
// IFrame for Online Application
let iframe;
// Overlay layer to hide parent page
let overlay;
// To be depricated in favor of websiteId
let dealerId;
// The websiteId wcontaining button configuration
let websiteId;
// Environment Type 'local', 'dev', 'testing', 'staging', 'prod'
let envType;
// Optional Salesperson name to be associated with a Lead
let salesPersonName;
// Optional to always bust widget cache
let bustCache;
// Reference to local storage object
let prodigyLocalStorage;
// Base URL for Online Application
let base;
// Object containing positioning and sizing for iFrame
let setIFrameDimensionsAndPosition;
// Boolean flag
let showIFrame;
// Boolean flag
let isGroupWebsite;
// Boolean flag
let enableOverlayClick = true;

// Reference to DDC Object
const DDC = {};

// Javascript API Interface Definition
const Prodigy = {
  // Button API Method to launch Online Application
  openFrame: undefined,
};

let loadedButtonsMap = {};

let ddcStandaloneAdded = false;

/**
 * Compares existing jQuery version to minimum
 *
 * @param   {String}  current  Current Version
 * @param   {String}  min      Minimum Supported Version
 *
 * @return  {Boolean}          Current Version is Less than Minimum Version
 */
function isMinJQueryVersion(current, min) {
  const version = current.split('.');
  const shortVersion = `${version[0]}.${version[1]}`;
  return parseFloat(shortVersion) <= parseFloat(min);
}

/**
 * Utility Method Determines if browser is mobile
 * Leverage media queries to determine max width
 *
 * @return  {Boolean}   Is browser mobile?
 */
function checkMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

/**
 * Get the base path for the api
 *
 * @param envType   Environment Type // local, staging, production
 * @returns the url of the api
 */
function getBaseApi(envType) {
  switch (envType) {
    case 'local':
      return 'http://localhost:8888';
    case 'dev':
      return 'https://dev-api.getprodigy.com';
    case 'staging':
      return 'https://staging-api.getprodigy.com';
    case 'testing':
      return 'https://testing-api.getprodigy.com';
    case 'production':
      return 'https://api.getprodigy.com';
    default:
      return 'https://api.getprodigy.com';
  }
}

/**
 * Get the base URL for the widget API
 *
 * @param envType   Environment Type // local, staging, production
 * @returns the url of the widget api
 */
function getWidgetAPI(envType) {
  const host = getBaseApi(envType);
  return `${host}/widgets`;
}

/**
 * Get URL for Button Groups API
 *
 * @param   {String}  envType         Environment Type // local, staging, production
 * @param   {String}  configType  Configuration Type // VDP, SRP
 * @param   {String}  dealerId     Unique Dealer ID
 * @param   {String}  websiteId   Unique Website ID
 *
 * @return  {String}  url       source URL for wizard
 */
function getButtonGroupsAPI(envType, configType, dealerId, websiteId) {
  const widgetAPI = getWidgetAPI(envType);
  let url = `${widgetAPI}/buttonGroups?type=${configType}`;
  if (dealerId) {
    url += `&dealerId=${dealerId}`;
  }
  if (websiteId) {
    url += `&websiteId=${websiteId}`;
  }
  url += `&vehicleIds=`;
  return url;
}

/**
 * Get the URL for the Standalone Buttons API
 *
 * @param envType Environment Type // local, staging, production
 * @param dealerId Unique Dealer ID
 * @param websiteId Unique Website ID
 * @param salesPersonName Sales Person Name for CRM
 * @param dealId Unique DealId
 * @returns the url for the standalone buttons API
 */
function getStandaloneButtonsAPI(envType, dealerId, websiteId, salesPersonName, dealId) {
  const widgetAPI = getWidgetAPI(envType);
  let url = `${widgetAPI}/standaloneButtons?`;
  if (dealerId) {
    url += `dealerId=${dealerId}`;
  }
  if (websiteId) {
    url += `websiteId=${websiteId}`;
  }
  if (salesPersonName) {
    url += `&salesPersonName=${salesPersonName}`;
  }
  if (dealId) {
    url += `&dealId=${dealId}`;
  }
  return url;
}

/**
 * Parse query string into the data object
 */
function parseQuery(queryString) {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

/**
 * Get URL for Wizard
 *
 * @param   {String}  base      Base URL from API
 * @param   {String}  action    Redirect Action
 * @param   {String}  vin       Unique Vehicle ID
 * @param   {String}  dealerId  Unique Dealer ID
 * @param   {String}  dealId  Unique Deal ID
 * @param   {String}  salesPersonName  Name of Sales Person for CRM
 * @param   {String}  websiteId  Unique Website Id
 * @param   {Boolean} piiFirst  Flag denotes if PII shodul be first step
 *
 * @return  {String}  url       source URL for wizard
 */
function getWizardSource(
  base,
  action,
  vin,
  dealerId,
  dealId,
  salesPersonName,
  piiFirst,
  websiteId,
) {
  dealId = dealId ? dealId.trim() : dealId;
  action = action || '';
  const sourceArr = [];
  if (piiFirst && piiFirst !== 'undefined') {
    // PII IS REQUIRED FIRST STEP
    // CONSTRUCT URL ACCORDINGLY
    // WEBSITE ID
    if (websiteId) {
      sourceArr.push(
        base,
        '/w/',
        websiteId,
        '/',
        vin,
        '?action=',
        action,
        '&source=',
        SOURCE,
        '&referrerDomain=',
        referrerDomain,
        '&iframe=true',
      );
      if (dealerId) {
        sourceArr.push(`&dealerId=${dealerId}`);
      }
    } else if (dealerId && !websiteId) {
      // DEALER ID
      sourceArr.push(
        base,
        '/',
        dealerId,
        '/',
        vin,
        '?action=',
        action,
        '&source=',
        SOURCE,
        '&referrerDomain=',
        referrerDomain,
        '&iframe=true',
      );
    }
  } else {
    // PII IS NOT REQUIRED AS FIRST STEP
    // CONSTRUCT URL ACCORDINGLY
    // eslint-disable-next-line no-lonely-if
    if (websiteId) {
      // WEBSITE ID WITHOUT PII
      sourceArr.push(
        base,
        '/w/',
        action,
        '/',
        websiteId,
        '/?source=',
        SOURCE,
        '&referrerDomain=',
        referrerDomain,
        '&iframe=true',
      );
      if (dealerId) {
        sourceArr.push(`&dealerId=${dealerId}`);
      }
    } else if (dealerId && !websiteId) {
      // DEALER ID WITHOUT PII
      sourceArr.push(
        base,
        '/',
        action,
        '/',
        dealerId,
        '/?source=',
        SOURCE,
        '&referrerDomain=',
        referrerDomain,
        '&iframe=true',
      );
    }
  }

  if (vin) {
    // FOUND VIN, LET'S DO SOMETHING WITH IT
    if (action === 'v' && !piiFirst) {
      // TARGET PAGE IS VEHICLE DETAIL
      // ADD VIN TO SOURCE ARRAY
      sourceArr.splice(5, 0, `/${vin}`);
    } else {
      // APPEND VIN AS A PARAM
      sourceArr.push(`&vin=${vin}`);
    }
  }

  if (salesPersonName !== 'undefined') {
    sourceArr.push('&salesPersonName=', salesPersonName);
  }

  if (dealId && dealId !== 'undefined') {
    sourceArr.push('&dealId=', dealId);
  }

  // Let Online know when it is loaded from the dealer gorup website
  if (isGroupWebsite) {
    sourceArr.push('&isGroupWebsite=true');
  }

  // Parse query params and append them to online url
  try {
    const location = window.location || {};
    const query = parseQuery(location.search || '');
    TRANSFER_QUERY_PARAMS.forEach(param => {
      if (param && query[param]) sourceArr.push(`&${param}=${query[param]}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('PRODIGY: Failed to parse query', error);
  }

  try {
    const gaClientId = ga.getAll()[0].get('clientId');
    if (gaClientId) {
      sourceArr.push(`&gaClientId=${gaClientId}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('PRODIGY: Failed to extract GA client ID', error);
  }

  try {
    const dataLayer = window.DDC.dataLayer;
    if (dataLayer) {
      const dealerCode = dataLayer.dealership.dealerCode[0]["dealertrack-post"];
      if (dealerCode) {
        sourceArr.push(`&dealerCode=${dealerCode}`);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('PRODIGY: Failed to retreive dealerCode from DDC', err);
  }

  return sourceArr.join('');
}

/**
 * Get URL for Analytics Tracking API
 *
 * @param   {String}  envType     Environment Type // local, staging, production
 *
 * @return  {String}  url       source URL for wizard
 */
function getTrackingAPI(envType) {
  let host;
  switch (envType) {
    case 'local':
      host = 'http://localhost:9999/timestamp';
      break;
    case 'dev':
      host = 'https://analytics-dev.getprodigy.com/timestamp';
      break;
    case 'staging':
      host = 'https://analytics-staging.getprodigy.com/timestamp';
      break;
    case 'testing':
      host = 'https://analytics-testing.getprodigy.com/timestamp';
      break;
    case 'production':
      host = 'https://analytics.getprodigy.com/timestamp';
      break;
    default:
      host = 'https://analytics.getprodigy.com/timestamp';
  }
  return host;
}

/**
 * Infer Dealers Web Host from stylesheets href
 *
 * @return  {String}  Inferred Dealer Web host
 */
function inferDealerWebHost() {
  const links = document.head.getElementsByTagName('link');
  let isDealerInspire = false;
  isDealerInspire = Object.keys(links).some(linkIndex => {
    return links[linkIndex].href.indexOf('dealerinspire.com') > -1;
  });
  return isDealerInspire ? DEALER_HOSTS.DEALER_INSPIRE : DEALER_HOSTS.DEFAULT;
}

/**
 * Main Agent Function
 * All content realted tasks are executed in this block
 *
 * @return  null
 */
function main() {
  scriptTag = document.getElementById('prodigyButtonGroupAgent');
  dealerId = scriptTag.getAttribute('dealerId');
  websiteId = scriptTag.getAttribute('websiteId');
  envType = scriptTag.getAttribute('envType');
  salesPersonName = scriptTag.getAttribute('salesPersonName');
  bustCache = scriptTag.getAttribute('bustCache');
  prodigyLocalStorage = window.localStorage;

  // Include Tooltip Libs
  const scriptTagPopper = document.createElement('script');
  const scriptTagTippy = document.createElement('script');
  scriptTagPopper.setAttribute('type', 'text/javascript');
  scriptTagPopper.setAttribute('src', '//unpkg.com/@popperjs/core@2/dist/umd/popper.min.js');
  scriptTagTippy.setAttribute('type', 'text/javascript');
  scriptTagTippy.setAttribute('src', '//unpkg.com/tippy.js@6/dist/tippy-bundle.umd.js');
  (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(
    scriptTagPopper,
  );
  (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(
    scriptTagTippy,
  );

  // Set EnvType from scriptTag.src params if available
  const params = scriptTag.src.split('?')[1];
  if (params && params.length && params.indexOf('envType') === 0) {
    envType = params.split('=')[1];
  }

  // TODO REMOVE THIS BLOCK AFTER GERMAIN GROUP
  // IS COMPLETELY MIGRATED TO WEBSITEID
  // REL-3452
  // Hardcoding dealerIds belonging to Germain group
  // to automatically route to websiteId
  if (
    dealerId &&
    ['germaintoyota', 'lexus-of-lexington', 'lexus-of-northborough'].indexOf(dealerId) > -1
  ) {
    websiteId = dealerId;
    dealerId = undefined;
  }

  function getDealId() {
    const dealIdSetDate = prodigyLocalStorage.getItem('prodigy:dealIdSetDate');
    // No deal id date set, set it to now.
    if (!dealIdSetDate) {
      prodigyLocalStorage.setItem('prodigy:dealIdSetDate', moment());
    } else if (moment() > moment(dealIdSetDate).add(30, 'days')) {
      // If deal id was set more than 30 days ago, clear it
      return null;
    }
    return prodigyLocalStorage.getItem('prodigy:dealId');
  }

  const dealId = getDealId();

  // TODO SHIFT TRACKING STUFF HERE
  // const shiftTracking = scriptTag.getAttribute('shiftTracking') || false;

  const standaloneButtonsAPI = getStandaloneButtonsAPI(
    envType,
    dealerId,
    websiteId,
    salesPersonName,
    dealId,
  );

  const tradeInButtonMarkupLoading = '<div class="trade-container"></div>';
  const preapprovalButtonMarkup = '<div class="pre-approved-container"></div>';
  const browseButtonMarkupLoading = '<div class="browse-container"></div>';
  const pricingGroupLoadingMarkup = `
    <div class="prodigy-button-group-container prodigy-button-group-container-loading">
      <div class="prodigy-lead-capture-container"><span class="prodigy-msg">Loading...</span></div>
    </div>`;
  const getStandaloneButtonLoadingMarkup = markup => `
    <div class="prodigy-standalone-button-container prodigy-standalone-button-container-loading">
      ${markup}
    </div>`;

  function isPricingGroupElement(container) {
    return container.type === 'pricing-group';
  }

  /**
   * Factory that returns a function with is true if the given container is
   * of type 'pricing-group' and matches the given configType
   * @param {String} configType the configType to match the container against
   */
  const isPricingGroupElementOfType = configType => container =>
    isPricingGroupElement(container) && container.configType === configType;

  function isStandaloneElement(container) {
    return container.type === 'standalone';
  }

  function isAPIElement(container) {
    return container.type === BUTTON_TYPES.API;
  }

  // this stores prodigy button elements that initially on, or added to, the page
  // while their markup is loaded
  let buttonContainers = [];

  // This store a reference to the timeout function
  // that will request execute the API request
  let buttonGroupsTimer;

  // the markups for standalone buttons, loaded in if any standalone buttons are found on the site
  let standaloneButtonMarkups;
  let fetchingStandaloneButtonMarkups = false;

  // Target element to be observed for Mutations
  const target = document.body;

  // Mutation Observer Configuration
  const config = {
    attributes: false,
    attributeOldValue: false,
    characterData: false,
    characterDataOldValue: false,
    childList: true,
    subtree: true,
  };

  // TODO RESTORE THIS AFTER GERMAIN HACK
  // REL-2424
  // if (dealerId === undefined) {
  //   // Invalid config, bail out early
  //   // eslint-disable-next-line no-console
  //   console.error('PRODIGY: INVALID CONFIGURATION: Please validate parameters.');
  //   return;
  // }

  /**
   * Finds pricing group containers within the given element
   *
   * @param {HTMLElement}   element       the element to search in
   * @param {String | null} loadingMarkup the loading placeholder to set
   *                                      in the container, not set if null
   * @returns {Boolean} whether a pricing button container element was added or not
   */
  function findPricingGroupButtonContainers(element, loadingMarkup) {
    let addedGroups = false;
    jQuery(element)
      .find(PRICING_BUTTON_GROUP_SELECTOR)
      .addBack(PRICING_BUTTON_GROUP_SELECTOR)
      .each((_index, group) => {
        const configType = jQuery(group).data(PRICING_BUTTON_GROUP_CONFIGTYPE_ATTR);
        // check if configType is valid
        if (!configType) {
          // eslint-disable-next-line no-console
          console.error(
            `PRODIGY: INVALID CONFIGURATION: data-${PRICING_BUTTON_GROUP_CONFIGTYPE_ATTR} is missing from ${PRICING_BUTTON_GROUP_SELECTOR}`,
          );
          return;
        }
        if (PRICING_BUTTON_GROUP_TYPES.indexOf(configType) === -1) {
          // eslint-disable-next-line no-console
          console.error(
            `PRODIGY: INVALID CONFIGURATION: data-${PRICING_BUTTON_GROUP_CONFIGTYPE_ATTR} is an invalid value '${configType}', supported values: ${PRICING_BUTTON_GROUP_TYPES.join(
              ', ',
            )}`,
          );
          return;
        }

        const vin = jQuery(group).data(PRICING_BUTTON_GROUP_VIN_ATTR);

        // Inject loading markup if we haven't already loaded this button
        if (loadingMarkup && !loadedButtonsMap[vin]) {
          jQuery(group).html(loadingMarkup);
        }

        buttonContainers.push({
          type: 'pricing-group',
          element: group,
          vin,
          configType,
        });

        addedGroups = true;
      });

    return addedGroups;
  }

  /**
   * Adds any standalone buttons within the given element
   *
   * @param {HTMLElement} element       the element to search
   * @param {String}      selector      the selector for the button container
   * @param {String}      name          the name of the standalone button
   * @param {String}      loadingMarkup the loading placeholder to set
   *                                    in the container, not set if null
   * @returns {Boolean} whether a standalone element was added or not
   */
  function findStandaloneButtonContainers(element, selector, name, loadingMarkup) {
    let addedGroups = false;
    jQuery(element)
      .find(selector)
      .each((index, group) => {
        if (loadingMarkup) {
          jQuery(group).html(loadingMarkup);
        }
        buttonContainers.push({
          type: 'standalone',
          element: group,
          name,
        });
        addedGroups = true;
      });
    return addedGroups;
  }

  function findAPIButtonContainers(element) {
    let addedButtons = false;
    jQuery(element)
      .find('[data-config-type="API"]')
      .each((index, apiButton) => {
        buttonContainers.push({
          type: BUTTON_TYPES.API,
          element: apiButton,
        });
        addedButtons = true;
      });
    return addedButtons;
  }

  /**
   * Traverse DOM to locate button containers
   */
  function findButtonContainers() {
    findPricingGroupButtonContainers(document, null);
    findStandaloneButtonContainers(document, STANDALONE_TRADEIN_BUTTON_SELECTOR, 'tradein', null);
    findStandaloneButtonContainers(
      document,
      STANDALONE_PREAPPROVAL_BUTTON_SELECTOR,
      'preapproval',
      null,
    );
    findAPIButtonContainers(document);
    findStandaloneButtonContainers(document, STANDALONE_BROWSE_BUTTON_SELECTOR, 'browse', null);
  }

  /**
   * Render default Loading State
   *
   * @return  null
   */
  function showLoadingState() {
    buttonContainers.forEach(buttonContainer => {
      let loadingMarkup;
      if (isPricingGroupElement(buttonContainer)) {
        loadingMarkup = pricingGroupLoadingMarkup;
      } else if (buttonContainer.name === 'tradein') {
        loadingMarkup = getStandaloneButtonLoadingMarkup(tradeInButtonMarkupLoading);
      } else if (buttonContainer.name === 'preapproval') {
        loadingMarkup = getStandaloneButtonLoadingMarkup(preapprovalButtonMarkup);
      } else if (buttonContainer.name === 'browse') {
        loadingMarkup = getStandaloneButtonLoadingMarkup(browseButtonMarkupLoading);
      }
      jQuery(buttonContainer.element).html(loadingMarkup);
    });
  }

  /**
   * Show Wizard IFrame
   *
   * @return  null
   */
  showIFrame = function showIFrame(src) {
    // update overlay with iframe
    iframe.attr('src', src);
    // show overlay
    overlay.fadeIn('slow', () => {
      jQuery('body').css('overflow', 'hidden');
    });
    iframe.fadeIn('slow');
  };

  /**
   * Hide Wizard IFrame
   *
   * @return  null
   */
  function hideIFrame() {
    // hide overlay
    overlay.fadeOut('slow', () => {
      jQuery('body').css('overflow', 'scroll');
    });
    iframe.fadeOut('slow');
    // Clear iframe source
    iframe.attr('src', '');
  }

  /**
   * Format data action attribute
   * into string consumable by Analytics API
   *
   * @param   {Object}  element   DOM Element
   *
   * @return  {String}            Action String for Analytics
   */
  function getActionId(element) {
    const action = jQuery(element).data('action');
    switch (action) {
      case 'tradeIn':
        return 'TRADE_IN';
      case 'paymentOptions':
        return 'PAYMENT_OPTIONS';
      case 'preApproved':
        return 'PREAPPROVED';
      case 'testDrive':
        return 'TEST_DRIVE';
      default:
        return 'CREATE_DEAL';
    }
  }

  /**
   * Get Button Markup for given VINs
   *
   * @param   {Array}  vins   List of VINs
   *
   * @return  null
   */
  function trackEvent(action, id) {
    const url = getTrackingAPI(envType);
    const now = Date.now();
    const dealId = getDealId();
    const payload = {
      payload: {
        action,
        target: id,
        deal_id: dealId,
        dealer_id: dealerId,
      },
      name: 'widget:event',
      timestamp: now,
    };
    jQuery.post({
      url,
      data: payload,
      dataType: 'json',
    });
  }

  /**
   * Set Conditional Dimensions and Position for iFrame
   * New Wizard uses near full page iFrame
   */
  setIFrameDimensionsAndPosition = function setIFrameDimensionsAndPosition() {
    const isMobile = checkMobile();
    const win = window;
    const topOffset = win.pageYOffset;
    const leftOffset = win.pageXOffset;
    const maxHeight = '95%';
    const width = '98%';

    if (isMobile) {
      // IN MOBILE DISPLAY
      // SHOW FULL PAGE IFRAME
      // POSITIONED TO CENTER OF VIEWPORT
      iframe.attr(
        'style',
        `height: 100%; max-height:100vh; width: 100vw; top: ${topOffset}px; left: ${leftOffset}px;`,
      );
    } else {
      // NOT MOBILE
      // SHOW NEAR FULL PAGE IFRAME
      // POSITIONED TO CENTER OF VIEWPORT
      iframe.attr(
        'style',
        `height:100%; max-height:${maxHeight}; position: absolute; top: 50%; transform: translate(-50%, -50%); left: 50%;`,
      );
      iframe.attr('width', width);
    }
  };

  /**
   * Refresh Button Event Handlers
   *
   * @param {String}  base   Base URL string as returned by API
   */
  function refreshButtonEventHandlers(base) {
    const dealId = getDealId();
    // Bind click events to Buttons
    jQuery('.prodigy-button, .prodigy-button-image').each((index, value) => {
      jQuery(value)
        .off('click')
        .on('click', function bindEventToWizardAction(e) {
          const src = getWizardSource(
            base,
            jQuery(this).data('action'),
            jQuery(this).data('vin'),
            jQuery(this).data('dealer-id'),
            dealId,
            encodeURI(jQuery(this).data('sales-person-name')),
            jQuery(this).data('pii-first'),
            websiteId,
          );

          // Set iFrame Dimension
          setIFrameDimensionsAndPosition();

          // Make iframe close on overlay click
          enableOverlayClick = true;

          // Show the iFrame
          showIFrame(src);
          e.stopPropagation();
          e.preventDefault();
          trackEvent('CLICK', getActionId(this));
        });
    });
  }

  /**
   * Success Callback for getButtonGroups
   * Apply Button Group HTML to each Button Group of the given configType
   * Bind click events to Buttons
   * Apply Dealer Specific Styles
   *
   * @param   {Object}  resp  Server Response
   *
   * @return  null
   */
  const getButtonGroupsSuccess = configType => resp => {
    // Replace HTML
    const groups = resp.buttonGroups;

    base = resp.baseUrl;

    console.log(base);

    // Update loadedButtonsMap with newly generated groups
    loadedButtonsMap = jQuery.extend({}, loadedButtonsMap, groups);

    // Check if widgets are loaded on the group website
    isGroupWebsite = resp.isGroupWebsite || false;

    // Apply Button Group HTML to each Button Group
    buttonContainers.filter(isPricingGroupElementOfType(configType)).forEach(buttonContainer => {
      // Clear out the loading markup with HTML from backend
      // If no HTML available for this buttonContainer,
      // render empty string
      const html = loadedButtonsMap[buttonContainer.vin] || groups[buttonContainer.vin] || '';
      jQuery(buttonContainer.element).html(html);
    });

    // Reset Initial Values
    buttonContainers = buttonContainers.filter(
      c => !isPricingGroupElement(c) || c.type !== configType,
    );

    // Refresh event handlers
    refreshButtonEventHandlers(base);

    // Inject CSS
    const dealerStyles = jQuery(resp.CSS);
    const dealerStylesId = jQuery(dealerStyles).attr('id');
    if (document.getElementById(dealerStylesId) === null) {
      jQuery('body').append(dealerStyles);
    }

    // Add the Standalone button markup
    // if this is a DDC integration
    if (resp.standaloneConfig && DDC.API && !ddcStandaloneAdded) {
      // eslint-disable-next-line no-use-before-define
      ddcAddStandaloneMarkup(resp.standaloneConfig);
    }

    // Locate all items requiring tooltips
    const toolTipElements = document.getElementsByClassName('prodigy-tooltip');
    if (toolTipElements && toolTipElements.length > 0) {
      jQuery(toolTipElements).each((index, element) => {
        setTimeout(() => {
          if (index !== undefined && element && tippy) {
            const tip = jQuery(element).data('tip');
            tippy(element, { content: tip });
          }
        }, 200);
      });
    }
  };

  /**
   * Error Callback for getButtonGroups
   * Clear Loading State
   *
   * @param   {Object}  resp  Server Response
   *
   * @return  null
   */
  const getButtonGroupsError = configType => (/* resp */) => {
    buttonContainers.filter(isPricingGroupElementOfType(configType)).forEach(buttonContainer => {
      // Replace Loading State with Empty String
      jQuery(buttonContainer.element).html('');
    });
  };

  /**
   * Filters out duplicate and Previously fetched VINS
   *
   * @param   {String}  value  VIN
   * @param   {Integer} index  Index of value within self
   * @param   {Object}  self   Array of VINS
   *
   * @return  {Object}         Filtered Array of VINS
   */
  function vinFilter(value, index, self) {
    return self.indexOf(value) === index && !loadedButtonsMap[value];
  }

  function getButtonGroupsForType(configType) {
    const containers = buttonContainers.filter(isPricingGroupElementOfType(configType));
    // only load button groups if there are any found for this type
    if (containers.length === 0) {
      return;
    }

    // Filter out duplicate and previously fetched VINS
    const vins = containers.map(c => c.vin).filter(vinFilter);

    let url = getButtonGroupsAPI(envType, configType, dealerId, websiteId) + vins.join(',');
    const dealId = getDealId();
    if (dealId) {
      url = `${url}&dealId=${dealId}`;
    }

    if (salesPersonName) {
      url += `&salesPersonName=${salesPersonName}`;
    }

    if (DDC.API) {
      // If DDC.API is defined
      // we can safely assume this is a DDC integration
      // let's get the standalone button config in our response
      url += `&getStandaloneConfig=true`;
    }

    // Bust the cache to get latest data from Cloudfront
    if (bustCache) {
      const timeStampString = Date.now();
      url += `&cacheBust=${timeStampString}`;
    }

    // Clear out previous Timeout, if it exists
    clearTimeout(buttonGroupsTimer);
    // Generate Timeout to make sure the DOM
    // has stopped updating before firing
    buttonGroupsTimer = setTimeout(() => {
      jQuery.ajax({
        url,
        success: getButtonGroupsSuccess(configType),
        error: getButtonGroupsError(configType),
      });
    }, 200);
  }

  /**
   * Gets Button Markup for the defined types
   */
  function getButtonGroups() {
    PRICING_BUTTON_GROUP_TYPES.forEach(getButtonGroupsForType);
  }

  /**
   * Success Callback for getStandaloneButtons
   * Apply Standalone Button HTML to each Button
   * Bind click events to Buttons
   * Apply Button Specific Styles for the dealer
   *
   * @param resp  Server Response, cache is used if this is not provided
   */
  function getStandaloneButtonsSuccess(resp) {
    // cache resp to avoid additional calls since standalone buttons don't change
    if (resp) {
      standaloneButtonMarkups = resp;
      fetchingStandaloneButtonMarkups = false;
    }

    base = resp.baseUrl;

    // Apply Button Group HTML to each Button Group
    buttonContainers.filter(isStandaloneElement).forEach(buttonContainer => {
      jQuery(buttonContainer.element).html(
        standaloneButtonMarkups.standaloneButtons[buttonContainer.name],
      );
    });

    // Reset Initial Values
    buttonContainers = buttonContainers.filter(c => !isStandaloneElement(c));

    // Refresh event handlers
    refreshButtonEventHandlers(base);

    // Inject CSS
    const standaloneStyles = jQuery(standaloneButtonMarkups.CSS);
    const standaloneStylesId = jQuery(standaloneStyles).attr('id');
    if (document.getElementById(standaloneStylesId) === null) {
      jQuery('body').append(standaloneStyles);
    }
  }

  /**
   * Error Callback for getStandaloneButtons
   * Clear Loading State
   *
   * @param   {Object}  resp  Server Response
   */
  function getStandaloneButtonsError() {
    fetchingStandaloneButtonMarkups = false;
    buttonContainers.filter(isStandaloneElement).forEach(buttonContainer => {
      // Replace Loading State with Empty String
      jQuery(buttonContainer.element).html('');
    });
  }

  /**
   * Get Standalone Button Markups
   */
  function getStandaloneButtons() {
    // only load button groups if there are any found and we're not already fetching them
    if (
      buttonContainers.filter(isStandaloneElement).length === 0 ||
      fetchingStandaloneButtonMarkups
    ) {
      return;
    }
    const dealId = getDealId();
    const standaloneButtonURL = getStandaloneButtonsAPI(
      envType,
      dealerId,
      websiteId,
      salesPersonName,
      dealId,
    );
    fetchingStandaloneButtonMarkups = true;
    jQuery.ajax({
      url: standaloneButtonURL,
      success: getStandaloneButtonsSuccess,
      error: getStandaloneButtonsError,
    });
  }

  /**
   * Get API Buttons
   */
  function getAPIButtons() {
    if (buttonContainers.filter(isAPIElement).length === 0 || fetchingStandaloneButtonMarkups) {
      return;
    }
    jQuery.ajax({
      url: standaloneButtonsAPI,
      success: getStandaloneButtonsSuccess,
      error: getStandaloneButtonsError,
    });
  }

  /**
   * Send Lead Info to FlowFound
   */
  function doFlowFound(applicant) {
    if (
      window &&
      window.ffPostLeadInformation &&
      typeof window.ffPostLeadInformation === 'function'
    ) {
      window.ffPostLeadInformation('prodigy', applicant);
    }
  }

  /**
   * Message Event Handler
   *
   * @param   {Object}  event  Natural Event Object
   *
   * @return  null
   */
  function messageHandler(event) {
    // On DealId event
    // set dealID in prodigyLocalStorage
    // parse page for buttonContainers
    // update button groups with unlocked prices
    if (
      event.data &&
      typeof event.data === 'string' &&
      event.data.indexOf('dealId:') > -1 &&
      typeof event.data.split(':')[1] !== 'undefined'
    ) {
      const dealId = getDealId();
      if (!dealId) {
        // We are now setting a new deal id in local storage
        // Clear out LoadedButtonsMap so we can get fresh HTML
        loadedButtonsMap = {};
      }
      prodigyLocalStorage.setItem('prodigy:dealId', event.data.split(':')[1]);
      prodigyLocalStorage.setItem('prodigy:dealIdSetDate', moment());
      findButtonContainers();
      getButtonGroups();
      getStandaloneButtons();
      getAPIButtons();
    }

    switch (event.data) {
      case 'CLOSE_IFRAME':
        hideIFrame();
        break;
      case 'ENABLE_OVERLAY_CLICK':
        enableOverlayClick = true;
        break;
      case 'DISABLE_OVERLAY_CLICK':
        enableOverlayClick = false;
        break;
      default:
        break;
    }

    if (
      event.data &&
      typeof event.data === 'string' &&
      event.data.indexOf('applicantInfo:') > -1 &&
      typeof event.data.split(':')[1] !== 'undefined'
    ) {
      const applicant = JSON.parse(event.data.substring(15));
      doFlowFound(applicant);
    }
  }

  /**
   * Mutation Observation Subscriber
   * This method is called each time a DOM mutation is observed
   *
   * @param   {Array}  mutations    List of Mutation Objects
   *
   * @return  null
   */
  function subscriber(mutations) {
    let addedPricingButtonGroups = false;
    let addedStandaloneButtons = false;
    let addedAPIButtons = false;
    let element;
    mutations.forEach(mutation => {
      // handle mutations here
      if (mutation.addedNodes.length) {
        if (
          (DEALER_HOST === DEALER_HOSTS.DEALER_INSPIRE &&
            jQuery(mutation.target).hasClass('entry')) ||
          jQuery(mutation.target).hasClass('listings-column') ||
          jQuery(mutation.target).hasClass('listings-row') ||
          // 26 Motors
          (jQuery(mutation.target).hasClass('tdicons') && jQuery(mutation.target).is('td'))
        ) {
          // Mutation target for dealers using Dealer Inspire
          element = mutation.target;
        } else {
          // Default mutation target for other Dealers
          element = mutation.addedNodes[0];
        }
        addedPricingButtonGroups = findPricingGroupButtonContainers(
          element,
          pricingGroupLoadingMarkup,
        );
        addedStandaloneButtons =
          findStandaloneButtonContainers(
            element,
            STANDALONE_TRADEIN_BUTTON_SELECTOR,
            'tradein',
            getStandaloneButtonLoadingMarkup(tradeInButtonMarkupLoading),
          ) || addedStandaloneButtons;
        addedStandaloneButtons =
          findStandaloneButtonContainers(
            element,
            STANDALONE_PREAPPROVAL_BUTTON_SELECTOR,
            'preapproval',
            getStandaloneButtonLoadingMarkup(preapprovalButtonMarkup),
          ) || addedStandaloneButtons;
        addedAPIButtons = findAPIButtonContainers(element);
        addedStandaloneButtons =
          findStandaloneButtonContainers(
            element,
            STANDALONE_BROWSE_BUTTON_SELECTOR,
            'browse',
            getStandaloneButtonLoadingMarkup(browseButtonMarkupLoading),
          ) || addedStandaloneButtons;
      }

      if (addedPricingButtonGroups) {
        getButtonGroups();
      }
      if (addedStandaloneButtons) {
        getStandaloneButtons();
      }
      if (addedAPIButtons) {
        getAPIButtons();
      }
    });
  }

  // Assign Mutation Observer to variable
  const observer = new MutationObserver(subscriber);

  jQuery(document).ready(() => {
    DEALER_HOST = inferDealerWebHost();

    findButtonContainers();
    showLoadingState();

    // Generate Prodigy Styles
    const prodigyStyles = jQuery(`<style type="text/css" id="prodigy-styles">${styles}</style>`);

    // Set iFrame and Overlay Elements
    overlay = jQuery('<div id="prodigy-wizard-overlay"></div>');
    iframe = jQuery(
      '<iframe id="prodigy-online-container" class="prodigy-wizard" frameborder="0" allow="microphone *; camera *"></iframe>',
    );

    // append iframe to overaly
    overlay.append(iframe);
    // append overlay to body
    jQuery('body').append(overlay);
    // append prodigyStyles to body
    jQuery('body').append(prodigyStyles);

    // Get Buttons
    getButtonGroups();
    getStandaloneButtons();
    getAPIButtons();

    // Bind overlay click event
    overlay.click(function onClick() {
      if (enableOverlayClick) {
        hideIFrame();
      }
    });

    // observing target
    observer.observe(target, config);

    // Register event listener
    window.addEventListener('message', messageHandler, false);

    // Track Page Load
    trackEvent('LOAD', null);
  });
}

// Called once jQuery has loaded
function scriptLoadHandler() {
  // Restore $ and window.jQuery to their previous values and store the
  // new jQuery in our local jQuery variable
  jQuery = window.jQuery.noConflict(true);
  // Call our main function
  main();
}

// Load jQuery if not present
// or if below minimum version
if (
  window.jQuery === undefined ||
  !window.jQuery.fn ||
  isMinJQueryVersion(window.jQuery.fn.jquery, '3.0')
) {
  const scriptTag = document.createElement('script');
  scriptTag.setAttribute('type', 'text/javascript');
  scriptTag.setAttribute('src', '//ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js');
  if (scriptTag.readyState) {
    scriptTag.onreadystatechange = () => {
      // For old versions of IE
      if (this.readyState === 'complete' || this.readyState === 'loaded') {
        scriptLoadHandler();
      }
    };
  } else {
    scriptTag.onload = scriptLoadHandler;
  }
  // Try to find the head, otherwise default to the documentElement
  (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(scriptTag);
} else {
  // The jQuery version on the window is the one we want to use
  jQuery = window.jQuery;
  main();
}

Prodigy.openFrame = target => {
  let dealId;
  const dealIdSetDate = prodigyLocalStorage.getItem('prodigy:dealIdSetDate');
  if (!dealIdSetDate) {
    prodigyLocalStorage.setItem('prodigy:dealIdSetDate', moment());
  } else if (moment() > moment(dealIdSetDate).add(30, 'days')) {
    dealId = null;
  }
  dealId = prodigyLocalStorage.getItem('prodigy:dealId');
  const src = getWizardSource(
    base,
    target || 'browse',
    undefined,
    dealerId,
    dealId,
    salesPersonName,
    true,
    websiteId,
  );

  // Set iFrame Dimension
  setIFrameDimensionsAndPosition(true);

  // Show the iFrame
  showIFrame(src);
};

Prodigy.startDDC = (pageLoadEvent, API) => {
  // Store a local reference to DDC API
  DDC.API = API;

  return DDC.API.insert('vehicle-pricing', function insertVehiclePricingMarkup(elem, meta) {
    const configType = pageLoadEvent.payload.searchPage ? 'SRP' : 'VDP';
    const vin = meta.vin;
    const prodigyButtonContainer = document.createElement('div');
    prodigyButtonContainer.classList.add('prodigy-pricing-button-group');
    prodigyButtonContainer.setAttribute('data-vin', vin);
    prodigyButtonContainer.setAttribute('data-config-type', configType);
    DDC.API.append(elem, prodigyButtonContainer);
  });
};

function ddcAddStandaloneMarkup(config) {
  return DDC.API.insert('primary-banner', function insertStandaloneMarkup(elem) {
    const browseStandaloneContainer = document.createElement('div');
    const tradeInStandaloneContainer = document.createElement('div');
    const preapprovalStandaloneContainer = document.createElement('div');
    const standaloneButtons = document.createElement('div');

    browseStandaloneContainer.classList.add('prodigy-standalone-browse-button');
    tradeInStandaloneContainer.classList.add('prodigy-standalone-tradein-button');
    preapprovalStandaloneContainer.classList.add('prodigy-standalone-preapproval-button');
    standaloneButtons.classList.add('prodigy-standalone-button-container-ddc');

    if (config.browse) {
      standaloneButtons.append(browseStandaloneContainer);
    }

    if (config.preapproval) {
      standaloneButtons.append(preapprovalStandaloneContainer);
    }

    if (config.tradein) {
      standaloneButtons.append(tradeInStandaloneContainer);
    }

    DDC.API.append(elem, standaloneButtons);
    ddcStandaloneAdded = true;
  });
}

// Assign Prodigy Object to Window
// For consumption by Parent document
window.Prodigy = Prodigy;
