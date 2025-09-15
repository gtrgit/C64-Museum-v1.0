// import React from 'react'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, Label, ReactEcsRenderer, UiEntity, Input } from '@dcl/sdk/react-ecs'
import { 
  getCurrentPage, 
  getTotalPages, 
  setCurrentPage, 
  getFilteredGames,
  getItemsPerPage,
  getSearchQuery,
  setSearchQuery,
  getSelectedGenre,
  setSelectedGenre,
  getSelectedCreator,
  setSelectedCreator,
  getGenreCounts,
  getCreatorCounts,
  getSelectedYear,
  setSelectedYear,
  getYearCounts,
  clearFilters
} from './games-state'
import { updatePlanesWithCurrentPage } from './games-factory'
import { setupUi } from './games-ui'
import { updateRandomMaterialPool } from './games-knn-material-system'

export function setupPaginationUI() {
  ReactEcsRenderer.setUiRenderer(paginationUIComponent)
}

export const paginationUIComponent = () => {
  const currentPage = getCurrentPage()
  const totalPages = getTotalPages()
  const filteredCount = getFilteredGames().length
  const itemsPerPage = getItemsPerPage()
  const searchQuery = getSearchQuery()
  const selectedGenre = getSelectedGenre()
  const selectedCreator = getSelectedCreator()
  const selectedYear = getSelectedYear()
  const genreCounts = getGenreCounts()
  const creatorCounts = getCreatorCounts()
  const yearCounts = getYearCounts()
  
  // Debug logging every render
  // console.log(`🔍 DEBUG paginationUI: itemsPerPage=${itemsPerPage}, totalPages=${totalPages}, currentPage=${currentPage}`)
  
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredCount)
  
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages
  
  const handlePreviousPage = async () => {
    if (canGoPrevious) {
      console.log('📄 PAGINATION: Going to previous page', currentPage - 1)
      setCurrentPage(currentPage - 1)
      await updatePlanesWithCurrentPage()
      updateRandomMaterialPool() // Update KNN materials for new page
      setupUi()
    }
  }
  
  const handleNextPage = async () => {
    if (canGoNext) {
      console.log('📄 PAGINATION: Going to next page', currentPage + 1)
      setCurrentPage(currentPage + 1)
      await updatePlanesWithCurrentPage()
      updateRandomMaterialPool() // Update KNN materials for new page
      setupUi()
    }
  }
  
  const handleFirstPage = async () => {
    console.log('📄 PAGINATION: Going to first page')
    setCurrentPage(1)
    await updatePlanesWithCurrentPage()
    updateRandomMaterialPool() // Update KNN materials for new page
    setupUi()
  }
  
  const handleLastPage = async () => {
    console.log('📄 PAGINATION: Going to last page', totalPages)
    setCurrentPage(totalPages)
    await updatePlanesWithCurrentPage()
    updateRandomMaterialPool() // Update KNN materials for new page
    setupUi()
  }
  
  const handleGenreChange = async (genre: string) => {
    try {
      console.log('🏷️ FILTER: Changing genre to', genre)
      setSelectedGenre(genre)
      await updatePlanesWithCurrentPage()
      updateRandomMaterialPool()
      setupUi()
    } catch (error) {
      console.error('❌ ERROR in handleGenreChange:', error)
    }
  }

  const handleCreatorChange = async (creator: string) => {
    try {
      console.log('👨‍💻 FILTER: Changing creator to', creator)
      setSelectedCreator(creator)
      await updatePlanesWithCurrentPage()
      updateRandomMaterialPool()
      setupUi()
    } catch (error) {
      console.error('❌ ERROR in handleCreatorChange:', error)
    }
  }

  const handleSearchChange = async (query: string) => {
    try {
      console.log('🔍 SEARCH: Changing search query to', query)
      setSearchQuery(query.trim())
      await updatePlanesWithCurrentPage()
      updateRandomMaterialPool()
      setupUi()
    } catch (error) {
      console.error('❌ ERROR in handleSearchChange:', error)
    }
  }

  const handleYearChange = async (year: string) => {
    try {
      console.log('📅 FILTER: Changing year to', year)
      setSelectedYear(year)
      await updatePlanesWithCurrentPage()
      updateRandomMaterialPool()
      setupUi()
    } catch (error) {
      console.error('❌ ERROR in handleYearChange:', error)
    }
  }

  const handleClearFilters = async () => {
    console.log('🧹 FILTER: Clearing all filters')
    clearFilters()
    await updatePlanesWithCurrentPage()
    updateRandomMaterialPool() // Update KNN materials for filtered results
    setupUi()
  }
  
  // Get top genres sorted by count
  const sortedGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8) // Show top 8 genres
  
  // Get top creators sorted by count (limit to those with 3+ games)
  const sortedCreators = Object.entries(creatorCounts)
    .sort(([,a], [,b]) => b - a)
    .filter(([,count]) => count >= 3)
    .slice(0, 6) // Show top 6 creators
  
  // Get years from 1982 to 1993, filter out those with 0 count
  const sortedYears = []
  for (let year = 1982; year <= 1993; year++) {
    const yearStr = year.toString()
    if (yearCounts[yearStr] && yearCounts[yearStr] > 0) {
      sortedYears.push([yearStr, yearCounts[yearStr]])
    }
  }
  // Add 'unknown' at the end if it exists
  if (yearCounts['unknown'] && yearCounts['unknown'] > 0) {
    sortedYears.push(['unknown', yearCounts['unknown']])
  }
  
  // Debug logging (uncomment if needed)
  // console.log('🔍 DEBUG paginationUI render:')
  // console.log('   Genre counts:', Object.keys(genreCounts).length, 'genres')
  // console.log('   Creator counts:', Object.keys(creatorCounts).length, 'creators') 
  // console.log('   Sorted genres:', sortedGenres.length)
  // console.log('   Sorted creators:', sortedCreators.length)
  // console.log('   Selected genre:', selectedGenre)
  // console.log('   Selected creator:', selectedCreator)
  
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: 180, // Adjusted height for 30px buttons
        positionType: 'absolute',
        position: { bottom: 20, left: 0, right: 0 },
        padding: 16,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.8) }}
    >
      {/* Genre Filter Row */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 40,
          margin: '0 0 4px 0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap'
        }}
        uiBackground={{ color: Color4.create(0, 0, 0, 0) }}
      >
        {/* Left spacer to position 200px left of center */}
        <UiEntity
          uiTransform={{
            width: 440,
            height: 1
          }}
        />
        
        {/* Genre Label */}
        <UiEntity
          uiTransform={{
            width: 60,
            height: 30,
            margin: '1px 4px 1px 2px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          uiBackground={{ color: Color4.create(1, 1, 1, 0.2) }}
        >
          <Label
            value="Genre:"
            fontSize={14}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>
        
        {/* All Genres Button */}
        <Button
          value={`All (${filteredCount})`}
          variant={selectedGenre === 'all' ? 'primary' : 'secondary'}
          fontSize={12}
          onMouseDown={() => handleGenreChange('all')}
          uiTransform={{ 
            width: 80, 
            height: 30, 
            margin: '1px 1px',
            opacity: selectedGenre === 'all' ? 1 : 0.7
          }}
        />
        
        {/* Individual Genre Buttons */}
        {sortedGenres.map(([genre, count]) => (
          <Button
            key={genre}
            value={`${genre.charAt(0).toUpperCase() + genre.slice(1)} (${count})`}
            variant={selectedGenre === genre ? 'primary' : 'secondary'}
            fontSize={11}
            onMouseDown={() => handleGenreChange(genre)}
            uiTransform={{ 
              width: Math.max(80, (genre.length + count.toString().length + 3) * 7 + 10), 
              height: 30, 
              margin: '1px 2px',
              opacity: selectedGenre === genre ? 1 : 0.7
            }}
          />
        ))}
      </UiEntity>
      
      {/* Creators Filter Row */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 40,
          margin: '0 0 4px 0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap'
        }}
      >
        {/* Left spacer to position 200px left of center */}
        <UiEntity
          uiTransform={{
            width: 440,
            height: 1
          }}
        />
        
        {/* Creators Label */}
        <UiEntity
          uiTransform={{
            width: 70,
            height: 30,
            margin: '1px 4px 1px 2px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          uiBackground={{ color: Color4.create(1, 1, 1, 0.2) }}
        >
          <Label
            value="Creators"
            fontSize={14}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>
        
        {/* All Creators Button */}
        <Button
          value={`All (${filteredCount})`}
          variant={selectedCreator === 'all' ? 'primary' : 'secondary'}
          fontSize={12}
          onMouseDown={() => handleCreatorChange('all')}
          uiTransform={{ 
            width: 80, 
            height: 30, 
            margin: '1px 2px',
            opacity: selectedCreator === 'all' ? 1 : 0.7
          }}
        />
        
        {/* Individual Creator Buttons */}
        {sortedCreators.map(([creator, count]) => (
          <Button
            key={creator}
            value={`${creator} (${count})`}
            variant={selectedCreator === creator ? 'primary' : 'secondary'}
            fontSize={11}
            onMouseDown={() => handleCreatorChange(creator)}
            uiTransform={{ 
              width: Math.max(80, creator.length * 7 + 40), 
              height: 30, 
              margin: '1px 2px',
              opacity: selectedCreator === creator ? 1 : 0.7
            }}
          />
        ))}
      </UiEntity>
      
      {/* Search Titles & Year Row */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 45,
          margin: '0 0 4px 0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap'
        }}
      >
        {/* Left spacer to position 200px left of center */}
        <UiEntity
          uiTransform={{
            width: 440,
            height: 1
          }}
        />
        
        {/* Search Titles Section - Fixed position */}
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'nowrap',
            flexShrink: 0 // Prevent shrinking
          }}
        >
          {/* Search Titles Label */}
          <UiEntity
            uiTransform={{
              width: 100,
              height: 30,
              margin: '1px 4px 1px 2px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            uiBackground={{ color: Color4.create(1, 1, 1, 0.2) }}
          >
            <Label
              value="Search Titles:"
              fontSize={11}
              color={Color4.White()}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>
          
          {/* Search Input Field */}
          <Input
            onChange={(value) => handleSearchChange(value)}
            onSubmit={(value) => handleSearchChange(value)}
            fontSize={11}
            placeholder="Type title..."
            placeholderColor={Color4.create(0.6, 0.6, 0.6, 1)}
            uiTransform={{ 
              width: 150, 
              height: 30,
              margin: '1px 4px'
            }}
            color={Color4.Black()}
            uiBackground={{
              color: Color4.create(1, 1, 1, 0.9) // White background for input
            }}
            textAlign='middle-left'
          />
          
          {/* Current Search Display */}
          {searchQuery && (
            <Button
              value={`"${searchQuery}"`}
              variant='primary'
              fontSize={11}
              onMouseDown={() => {}} // Display only
              uiTransform={{ 
                width: Math.min(120, searchQuery.length * 6 + 20), 
                height: 30, 
                margin: '1px 1px',
                opacity: 0.8
              }}
            />
          )}
        </UiEntity>
        
        {/* Year Section - Separate container */}
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap', // Allow wrapping within year section only
            margin: '0 0 0 8px'
          }}
        >
          {/* Year Label */}
          <UiEntity
            uiTransform={{
              width: 50,
              height: 30,
              margin: '1px 4px 1px 0px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            uiBackground={{ color: Color4.create(1, 1, 1, 0.2) }}
          >
            <Label
              value="Year:"
              fontSize={14}
              color={Color4.White()}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>
          
          {/* All Years Button */}
          <Button
            value={`All (${filteredCount})`}
            variant={selectedYear === 'all' ? 'primary' : 'secondary'}
            fontSize={11}
            onMouseDown={() => handleYearChange('all')}
            uiTransform={{ 
              width: 80, 
              height: 30, 
              margin: '1px 2px',
              opacity: selectedYear === 'all' ? 1 : 0.7
            }}
          />
          
          {/* Individual Year Buttons */}
          {sortedYears.map(([year, count]) => (
            <Button
              key={year}
              value={`${year}\n(${count})`}
              variant={selectedYear === year ? 'primary' : 'secondary'}
              fontSize={10}
              onMouseDown={() => handleYearChange(String(year))}
              uiTransform={{ 
                width: year === 'unknown' ? 65 : 45, 
                height: 36, 
                margin: '1px 2px',
                opacity: selectedYear === year ? 1 : 0.7
              }}
              textAlign='middle-center'
            />
          ))}
        </UiEntity>
        
      </UiEntity>
      
      {/* Pagination Controls */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 30,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}
      >
        {/* Left spacer to position 200px left of center */}
        <UiEntity
          uiTransform={{
            width: 440,
            height: 1
          }}
        />
        
        {/* Results Counter */}
        <UiEntity
          uiTransform={{
            width: 220,
            height: 30,
            margin: '0 16px -10px 1',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          uiBackground={{ color: Color4.create(1, 1, 1, 0.2) }}
        >
          <Label
            value={`Showing ${startItem}-${endItem} of ${filteredCount} titles`}
            fontSize={12}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>
        
        {/* First Page Button */}
        <Button
          value='<<'
          variant={canGoPrevious ? 'primary' : 'secondary'}
          fontSize={14}
          onMouseDown={handleFirstPage}
          uiTransform={{ 
            width: 30, 
            height: 30, 
            margin: '0 1px -10px',
            opacity: canGoPrevious ? 1 : 0.5
          }}
        />
        
        {/* Previous Page Button */}
        <Button
          value='<'
          variant={canGoPrevious ? 'primary' : 'secondary'}
          fontSize={14}
          onMouseDown={handlePreviousPage}
          uiTransform={{ 
            width: 30, 
            height: 30, 
            margin: '0 0px -10 ',
            opacity: canGoPrevious ? 1 : 0.5
          }}
        />
        
        {/* Page Display */}
        <UiEntity
          uiTransform={{
            width: 150,
            height: 30,
            margin: '0 1px -10px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          uiBackground={{ color: Color4.create(1, 1, 1, 0.2) }}
        >
          <Label
            value={`Page ${currentPage} of ${totalPages}`}
            fontSize={14}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>
        
        {/* Next Page Button */}
        <Button
          value='>'
          variant={canGoNext ? 'primary' : 'secondary'}
          fontSize={14}
          onMouseDown={handleNextPage}
          uiTransform={{ 
            width: 30, 
            height: 30, 
            margin: '0 1px -10px',
            opacity: canGoNext ? 1 : 0.5
          }}
        />
        
        {/* Last Page Button */}
        <Button
          value='>>'
          variant={canGoNext ? 'primary' : 'secondary'}
          fontSize={14}
          onMouseDown={handleLastPage}
          uiTransform={{ 
            width: 30, 
            height: 30, 
            margin: '0 1px -10px',
            opacity: canGoNext ? 1 : 0.5
          }}
        />
        
        {/* Clear Filters Button */}
        <Button
          value='Clear All'
          variant='secondary'
          fontSize={14}
          onMouseDown={handleClearFilters}
          uiTransform={{ 
            width: 80, 
            height: 30, 
            margin: '0 4px -10px 10px'
          }}
          color={Color4.White()}
          uiBackground={{
            color: Color4.create(0.8, 0.3, 0.3, 0.8) // Reddish background for clear action
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}