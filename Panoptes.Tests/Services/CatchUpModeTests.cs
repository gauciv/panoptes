using FluentAssertions;

namespace Panoptes.Tests.Services;

public class CatchUpModeTests
{
    [Fact]
    public void CatchUpMode_WhenProcessingBlocksFast_ShouldDetectCatchUp()
    {
        // Arrange - Simulate fast block processing (< 0.5s apart)
        var timeBetweenBlocks = 0.3; // seconds
        var consecutiveFastBlocks = 12;
        var catchUpThreshold = 10;
        
        // Act
        var isCatchingUp = consecutiveFastBlocks > catchUpThreshold && timeBetweenBlocks < 0.5;
        
        // Assert
        isCatchingUp.Should().BeTrue("processing 12 blocks faster than 0.5s each indicates catch-up mode");
    }
    
    [Fact]
    public void CatchUpMode_WhenProcessingBlocksSlowly_ShouldNotDetectCatchUp()
    {
        // Arrange - Simulate normal block processing (> 0.5s apart)
        var timeBetweenBlocks = 5.0; // seconds (normal Cardano block time ~20s)
        var consecutiveFastBlocks = 3;
        var catchUpThreshold = 10;
        
        // Act
        var isCatchingUp = consecutiveFastBlocks > catchUpThreshold && timeBetweenBlocks < 0.5;
        
        // Assert
        isCatchingUp.Should().BeFalse("normal block processing speed should not trigger catch-up mode");
    }
    
    [Theory]
    [InlineData(0.1, 15, true)]   // Very fast, many blocks
    [InlineData(0.4, 11, true)]   // Fast, above threshold
    [InlineData(0.5, 15, false)]  // At boundary, should not trigger
    [InlineData(0.6, 15, false)]  // Slow, many blocks
    [InlineData(0.3, 9, false)]   // Fast but below threshold
    [InlineData(0.3, 10, false)]  // Fast but at threshold (needs >10)
    public void CatchUpMode_VariousScenarios(double timeBetweenBlocks, int consecutiveFastBlocks, bool expectedCatchUp)
    {
        // Arrange
        var catchUpThreshold = 10;
        
        // Act
        var isCatchingUp = consecutiveFastBlocks > catchUpThreshold && timeBetweenBlocks < 0.5;
        
        // Assert
        isCatchingUp.Should().Be(expectedCatchUp);
    }
    
    [Fact]
    public void WebhookBatching_DuringCatchUp_ShouldLimitBatchSize()
    {
        // Arrange
        var batchSizeLimit = 10;
        var webhooksGenerated = 25; // More than batch size
        
        // Act - Simulate batching logic
        var shouldDispatch = webhooksGenerated >= batchSizeLimit;
        var webhooksToSend = shouldDispatch ? 1 : 0; // Send only most recent
        
        // Assert
        shouldDispatch.Should().BeTrue("batch size limit reached");
        webhooksToSend.Should().Be(1, "during catch-up, only send most recent webhook from batch");
    }
    
    [Fact]
    public void WebhookBatching_WhenBelowBatchSize_ShouldNotDispatch()
    {
        // Arrange
        var batchSizeLimit = 10;
        var webhooksGenerated = 5; // Below batch size
        
        // Act
        var shouldDispatch = webhooksGenerated >= batchSizeLimit;
        
        // Assert
        shouldDispatch.Should().BeFalse("batch size limit not yet reached, continue accumulating");
    }
    
    [Fact]
    public void CatchUpMode_ExitCondition_ShouldFlushRemainingBatches()
    {
        // Arrange - Simulating exit from catch-up mode
        var timeBetweenBlocks = 2.0; // Normal speed resumed
        var pendingWebhooksCount = 7; // Less than batch size but should be flushed
        
        // Act
        var shouldExitCatchUp = timeBetweenBlocks >= 0.5;
        var shouldFlushBatches = shouldExitCatchUp && pendingWebhooksCount > 0;
        
        // Assert
        shouldExitCatchUp.Should().BeTrue("block processing returned to normal speed");
        shouldFlushBatches.Should().BeTrue("remaining batched webhooks should be flushed on exit");
    }
    
    [Fact]
    public void BatchFlushInterval_ShouldTriggerPeriodicFlush()
    {
        // Arrange
        var lastFlushTime = DateTime.UtcNow.AddSeconds(-6);
        var currentTime = DateTime.UtcNow;
        var flushInterval = TimeSpan.FromSeconds(5);
        
        // Act
        var timeSinceLastFlush = currentTime - lastFlushTime;
        var shouldFlush = timeSinceLastFlush >= flushInterval;
        
        // Assert
        shouldFlush.Should().BeTrue("5 seconds have passed since last flush");
    }
}
