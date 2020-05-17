import { transpile } from '../src/transpiler';
import { fs } from 'memfs';
test('Should avoid ident name start with _,$', done => {
  const typedef = `
  export class Ng1LocationServices implements LocationConfig, LocationServices {
    private $locationProvider: ILocationProvider;
    private $location: ILocationService;
    private $sniffer: any;
    private $browser: any;
    private $window: IWindowService;
_runtimeServices($rootScope, $location: ILocationService, $sniffer, $browser, $window: IWindowService) {
    this.$location = $location;
    this.$sniffer = $sniffer;
    this.$browser = $browser;
    this.$window = $window;

    // Bind $locationChangeSuccess to the listeners registered in LocationService.onChange
    $rootScope.$on('$locationChangeSuccess', evt => this._urlListeners.forEach(fn => fn(evt)));
    const _loc = val($location);

    // Bind these LocationService functions to $location
    createProxyFunctions(_loc, this, _loc, ['replace', 'path', 'search', 'hash']);
    // Bind these LocationConfig functions to $location
    createProxyFunctions(_loc, this, _loc, ['port', 'protocol', 'host']);
  }
}
`;
  const expected = `type Ng1LocationServices* = ref object of RootObj
  locationProvider:ILocationProvider
  location:ILocationService
  sniffer:any
  browser:any
  window:IWindowService


proc runtimeServices(self:Ng1LocationServices,rootScope:auto,location:ILocationService,sniffer:auto,browser:auto,window:IWindowService): auto = 
  self.location = location
  self.sniffer = sniffer
  self.browser = browser
  self.window = window
  ## Bind $locationChangeSuccess to the listeners registered in LocationService.onChange
  rootScope.on("$locationChangeSuccess",proc (evt:auto): auto = 
  )
  var loc = val(location)
  ## Bind these LocationService functions to $location
  createProxyFunctions(loc,self,loc,@["replace","path","search","hash"])
  ## Bind these LocationConfig functions to $location
  createProxyFunctions(loc,self,loc,@["port","protocol","host"])

`;
  const { writer } = transpile(undefined, typedef);

  writer.on('close', () => {
    expect(fs.readFileSync(writer.path).toString()).toBe(expected);
    done();
  });
});
