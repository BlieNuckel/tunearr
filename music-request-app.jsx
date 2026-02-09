const MusicRequestApp = () => {
  // Get lucide icons
  const { Search, Music, Download, Settings, CheckCircle, XCircle, Clock, AlertCircle, Menu, X } = lucide;
  
  const [currentPage, setCurrentPage] = React.useState('search');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [settings, setSettings] = React.useState({
    lidarrUrl: localStorage.getItem('lidarrUrl') || '',
    lidarrApiKey: localStorage.getItem('lidarrApiKey') || ''
  });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchType, setSearchType] = React.useState('release-group');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [wantedReleases, setWantedReleases] = React.useState([]);
  const [queue, setQueue] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Save settings to localStorage
  const saveSettings = (newSettings) => {
    localStorage.setItem('lidarrUrl', newSettings.lidarrUrl);
    localStorage.setItem('lidarrApiKey', newSettings.lidarrApiKey);
    setSettings(newSettings);
  };

  // Handle page navigation and close mobile menu
  const navigateToPage = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  // MusicBrainz API search
  const searchMusicBrainz = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://musicbrainz.org/ws/2/${searchType}?query=${encodedQuery}&fmt=json&limit=20`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MusicRequestApp/1.0.0 (https://github.com/yourapp)'
        }
      });
      
      const data = await response.json();
      
      if (searchType === 'artist') {
        setSearchResults(data.artists || []);
      } else if (searchType === 'release-group') {
        setSearchResults(data['release-groups'] || []);
      } else if (searchType === 'release') {
        setSearchResults(data.releases || []);
      }
    } catch (error) {
      console.error('MusicBrainz search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Lidarr API - Search for artist
  const searchLidarrArtist = async (artistName, mbId) => {
    if (!settings.lidarrUrl || !settings.lidarrApiKey) {
      alert('Please configure Lidarr settings first');
      return null;
    }

    try {
      const url = `${settings.lidarrUrl}/api/v1/search?term=${encodeURIComponent(artistName)}`;
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': settings.lidarrApiKey
        }
      });
      
      const results = await response.json();
      
      // Try to find exact match by MusicBrainz ID
      const exactMatch = results.find(r => r.foreignArtistId === mbId);
      return exactMatch || results[0] || null;
    } catch (error) {
      console.error('Lidarr search error:', error);
      return null;
    }
  };

  // Lidarr API - Add artist
  const addArtistToLidarr = async (artistData) => {
    if (!settings.lidarrUrl || !settings.lidarrApiKey) {
      alert('Please configure Lidarr settings first');
      return;
    }

    try {
      // Get quality profile and metadata profile (use first available)
      const profilesResponse = await fetch(`${settings.lidarrUrl}/api/v1/qualityprofile`, {
        headers: { 'X-Api-Key': settings.lidarrApiKey }
      });
      const profiles = await profilesResponse.json();
      
      const metadataResponse = await fetch(`${settings.lidarrUrl}/api/v1/metadataprofile`, {
        headers: { 'X-Api-Key': settings.lidarrApiKey }
      });
      const metadataProfiles = await metadataResponse.json();

      // Get root folder
      const rootFolderResponse = await fetch(`${settings.lidarrUrl}/api/v1/rootfolder`, {
        headers: { 'X-Api-Key': settings.lidarrApiKey }
      });
      const rootFolders = await rootFolderResponse.json();

      const payload = {
        ...artistData,
        qualityProfileId: profiles[0]?.id || 1,
        metadataProfileId: metadataProfiles[0]?.id || 1,
        rootFolderPath: rootFolders[0]?.path || '/music',
        monitored: true,
        addOptions: {
          searchForMissingAlbums: true
        }
      };

      const response = await fetch(`${settings.lidarrUrl}/api/v1/artist`, {
        method: 'POST',
        headers: {
          'X-Api-Key': settings.lidarrApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Artist added to Lidarr successfully!');
        return true;
      } else {
        const error = await response.text();
        console.error('Failed to add artist:', error);
        alert('Failed to add artist to Lidarr');
        return false;
      }
    } catch (error) {
      console.error('Error adding artist:', error);
      alert('Error adding artist to Lidarr');
      return false;
    }
  };

  // Add item from search results
  const handleAddItem = async (item) => {
    if (searchType === 'artist') {
      // Search for artist in Lidarr first
      const lidarrArtist = await searchLidarrArtist(item.name, item.id);
      
      if (lidarrArtist) {
        await addArtistToLidarr(lidarrArtist);
      } else {
        alert('Could not find artist in Lidarr database');
      }
    } else {
      alert('For now, please add the artist. Album-specific adding coming soon!');
    }
  };

  // Fetch wanted releases from Lidarr
  const fetchWantedReleases = async () => {
    if (!settings.lidarrUrl || !settings.lidarrApiKey) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${settings.lidarrUrl}/api/v1/wanted/missing?pageSize=50`, {
        headers: { 'X-Api-Key': settings.lidarrApiKey }
      });
      const data = await response.json();
      setWantedReleases(data.records || []);
    } catch (error) {
      console.error('Error fetching wanted releases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch download queue from Lidarr
  const fetchQueue = async () => {
    if (!settings.lidarrUrl || !settings.lidarrApiKey) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${settings.lidarrUrl}/api/v1/queue?pageSize=50`, {
        headers: { 'X-Api-Key': settings.lidarrApiKey }
      });
      const data = await response.json();
      setQueue(data.records || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh status page
  React.useEffect(() => {
    if (currentPage === 'status') {
      fetchWantedReleases();
      fetchQueue();
      
      const interval = setInterval(() => {
        fetchWantedReleases();
        fetchQueue();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentPage, settings]);

  // Search Page
  const SearchPage = () => (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-white">Search Music</h1>
      
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="bg-gray-700 text-white px-4 py-3 md:py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
          >
            <option value="release-group">Albums (Release Groups)</option>
            <option value="release">Releases</option>
            <option value="artist">Artists</option>
          </select>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchMusicBrainz()}
            placeholder="Search for music..."
            className="flex-1 bg-gray-700 text-white px-4 py-3 md:py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
          />
          
          <button
            onClick={searchMusicBrainz}
            disabled={searching}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 md:py-2 rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
          >
            <Search size={18} />
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {searchResults.map((result, idx) => (
          <div key={idx} className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-white break-words">
                {result.name || result.title}
              </h3>
              <div className="text-sm text-gray-400 space-y-1 mt-1">
                {searchType === 'artist' && (
                  <>
                    <div>Type: {result.type || 'Unknown'}</div>
                    {result.country && <div>Country: {result.country}</div>}
                    {result['life-span']?.begin && (
                      <div>Active: {result['life-span'].begin} - {result['life-span'].end || 'Present'}</div>
                    )}
                  </>
                )}
                {(searchType === 'release-group' || searchType === 'release') && (
                  <>
                    <div className="break-words">Artist: {result['artist-credit']?.[0]?.name || 'Unknown'}</div>
                    {result['first-release-date'] && (
                      <div>Released: {result['first-release-date']}</div>
                    )}
                    {result['primary-type'] && <div>Type: {result['primary-type']}</div>}
                  </>
                )}
                <div className="text-xs text-gray-500 break-all">MusicBrainz ID: {result.id}</div>
              </div>
            </div>
            <button
              onClick={() => handleAddItem(result)}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-3 md:py-2 rounded font-medium w-full sm:w-auto touch-manipulation"
            >
              Add to Lidarr
            </button>
          </div>
        ))}
        
        {searchResults.length === 0 && !searching && (
          <div className="text-center text-gray-400 py-12">
            <Music size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">Search for artists, albums, or releases to get started</p>
          </div>
        )}
      </div>
    </div>
  );

  // Status Page
  const StatusPage = () => (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-white">Status & Queue</h1>
      
      {/* Wanted Releases */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-white flex items-center gap-2">
          <Clock size={20} className="md:w-6 md:h-6" />
          Wanted Releases ({wantedReleases.length})
        </h2>
        <div className="space-y-3">
          {wantedReleases.slice(0, 20).map((release, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-4">
              <div className="flex flex-col gap-2">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white break-words">{release.title}</h3>
                  <div className="text-sm text-gray-400 mt-1">
                    <div className="break-words">Artist: {release.artist?.artistName || 'Unknown'}</div>
                    {release.releaseDate && <div>Release Date: {release.releaseDate}</div>}
                    <div className="text-yellow-400 mt-1">Status: Missing</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {wantedReleases.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-8">
              <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No wanted releases</p>
            </div>
          )}
        </div>
      </div>

      {/* Download Queue */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-white flex items-center gap-2">
          <Download size={20} className="md:w-6 md:h-6" />
          Download Queue ({queue.length})
        </h2>
        <div className="space-y-3">
          {queue.map((item, idx) => {
            const hasWarnings = item.trackedDownloadStatus === 'warning';
            const hasErrors = item.trackedDownloadStatus === 'error';
            const isCompleted = item.status === 'completed';
            
            return (
              <div key={idx} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-white break-words">{item.title}</h3>
                    <div className="text-sm text-gray-400 mt-1">
                      {item.artist?.artistName && <div className="break-words">Artist: {item.artist.artistName}</div>}
                      <div>Quality: {item.quality?.quality?.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isCompleted && <CheckCircle size={20} className="text-green-500" />}
                    {hasErrors && <XCircle size={20} className="text-red-500" />}
                    {hasWarnings && <AlertCircle size={20} className="text-yellow-500" />}
                  </div>
                </div>
                
                {/* Progress bar */}
                {item.sizeleft > 0 && item.size > 0 && (
                  <div className="mb-2">
                    <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${((item.size - item.sizeleft) / item.size) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {((item.size - item.sizeleft) / item.size * 100).toFixed(1)}% - 
                      {item.timeleft || 'Calculating...'}
                    </div>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className={`inline-block px-2 py-1 rounded text-xs md:text-sm ${
                    hasErrors ? 'bg-red-600/20 text-red-400' :
                    hasWarnings ? 'bg-yellow-600/20 text-yellow-400' :
                    isCompleted ? 'bg-green-600/20 text-green-400' :
                    'bg-blue-600/20 text-blue-400'
                  }`}>
                    {item.status}
                  </span>
                  {item.statusMessages?.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      {item.statusMessages.map((msg, i) => (
                        <div key={i} className="break-words">• {msg.title}: {msg.messages?.join(', ')}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {queue.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-8">
              <Download size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No active downloads</p>
            </div>
          )}
        </div>
      </div>
      
      {loading && (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm md:text-base">Loading...</p>
        </div>
      )}
    </div>
  );

  // Settings Page
  const SettingsPage = () => {
    const [tempSettings, setTempSettings] = React.useState(settings);

    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-white">Settings</h1>
        
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 max-w-2xl">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-white">Lidarr Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lidarr URL
              </label>
              <input
                type="text"
                value={tempSettings.lidarrUrl}
                onChange={(e) => setTempSettings({...tempSettings, lidarrUrl: e.target.value})}
                placeholder="http://localhost:8686"
                className="w-full bg-gray-700 text-white px-4 py-3 md:py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
              />
              <p className="text-xs text-gray-400 mt-1">
                Example: http://localhost:8686 or http://192.168.1.100:8686
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={tempSettings.lidarrApiKey}
                onChange={(e) => setTempSettings({...tempSettings, lidarrApiKey: e.target.value})}
                placeholder="Your Lidarr API Key"
                className="w-full bg-gray-700 text-white px-4 py-3 md:py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
              />
              <p className="text-xs text-gray-400 mt-1">
                Find this in Lidarr under Settings → General → Security
              </p>
            </div>
            
            <button
              onClick={() => {
                saveSettings(tempSettings);
                alert('Settings saved successfully!');
              }}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 md:py-2 rounded font-medium touch-manipulation"
            >
              Save Settings
            </button>
          </div>
          
          {settings.lidarrUrl && settings.lidarrApiKey && (
            <div className="mt-6 p-4 bg-green-600/20 border border-green-600/30 rounded text-green-400 text-sm">
              ✓ Lidarr configuration saved
            </div>
          )}
          
          {(!settings.lidarrUrl || !settings.lidarrApiKey) && (
            <div className="mt-6 p-4 bg-yellow-600/20 border border-yellow-600/30 rounded text-yellow-400 text-sm">
              ⚠ Please configure Lidarr settings to use the app
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2">
              <Music className="text-blue-500" size={24} />
              <span className="text-lg md:text-xl font-bold text-white">Music Request</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-1">
              <button
                onClick={() => navigateToPage('search')}
                className={`px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors ${
                  currentPage === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Search size={18} />
                Search
              </button>
              
              <button
                onClick={() => navigateToPage('status')}
                className={`px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors ${
                  currentPage === 'status'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Download size={18} />
                Status
              </button>
              
              <button
                onClick={() => navigateToPage('settings')}
                className={`px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors ${
                  currentPage === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Settings size={18} />
                Settings
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-700 touch-manipulation"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-3 space-y-1">
              <button
                onClick={() => navigateToPage('search')}
                className={`w-full text-left px-4 py-3 rounded font-medium flex items-center gap-3 transition-colors touch-manipulation ${
                  currentPage === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Search size={20} />
                Search
              </button>
              
              <button
                onClick={() => navigateToPage('status')}
                className={`w-full text-left px-4 py-3 rounded font-medium flex items-center gap-3 transition-colors touch-manipulation ${
                  currentPage === 'status'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Download size={20} />
                Status
              </button>
              
              <button
                onClick={() => navigateToPage('settings')}
                className={`w-full text-left px-4 py-3 rounded font-medium flex items-center gap-3 transition-colors touch-manipulation ${
                  currentPage === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Settings size={20} />
                Settings
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {currentPage === 'search' && <SearchPage />}
        {currentPage === 'status' && <StatusPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
};