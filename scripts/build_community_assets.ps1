# CanvasPort community-directory screenshot builder.
# SPDX-License-Identifier: Apache-2.0

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot 'docs\community'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

function New-RoundedPath {
	param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
	$path = [System.Drawing.Drawing2D.GraphicsPath]::new()
	$diameter = $Radius * 2
	$path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
	$path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
	$path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
	$path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
	$path.CloseFigure()
	return $path
}

function Fill-RoundedRectangle {
	param($Graphics, $Brush, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
	$path = New-RoundedPath $X $Y $Width $Height $Radius
	$Graphics.FillPath($Brush, $path)
	$path.Dispose()
}

function Draw-RoundedRectangle {
	param($Graphics, $Pen, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
	$path = New-RoundedPath $X $Y $Width $Height $Radius
	$Graphics.DrawPath($Pen, $path)
	$path.Dispose()
}

function New-Canvas {
	$bitmap = [System.Drawing.Bitmap]::new(1200, 800)
	$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
	$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
	$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
	$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
	$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
	$graphics.Clear([System.Drawing.Color]::FromArgb(13, 14, 23))

	$gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(26, 255, 255, 255), 1)
	for ($x = 24; $x -lt 1200; $x += 32) {
		for ($y = 24; $y -lt 800; $y += 32) {
			$graphics.DrawEllipse($gridPen, $x, $y, 2, 2)
		}
	}
	$gridPen.Dispose()

	return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-Text {
	param($Graphics, [string]$Text, [float]$X, [float]$Y, [float]$Size, [System.Drawing.FontStyle]$Style, [System.Drawing.Color]$Color)
	$font = [System.Drawing.Font]::new('Segoe UI', $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
	$brush = [System.Drawing.SolidBrush]::new($Color)
	$Graphics.DrawString($Text, $font, $brush, $X, $Y)
	$brush.Dispose()
	$font.Dispose()
}

function Draw-ContainedImage {
	param($Graphics, [string]$Path, [float]$X, [float]$Y, [float]$Width, [float]$Height)
	$image = [System.Drawing.Image]::FromFile($Path)
	$scale = [Math]::Min($Width / $image.Width, $Height / $image.Height)
	$drawWidth = [float]($image.Width * $scale)
	$drawHeight = [float]($image.Height * $scale)
	$drawX = $X + (($Width - $drawWidth) / 2)
	$drawY = $Y + (($Height - $drawHeight) / 2)
	$Graphics.DrawImage($image, $drawX, $drawY, $drawWidth, $drawHeight)
	$image.Dispose()
}

function Draw-CoverImage {
	param($Graphics, [string]$Path, [float]$X, [float]$Y, [float]$Width, [float]$Height)
	$image = [System.Drawing.Image]::FromFile($Path)
	$sourceRatio = $image.Width / $image.Height
	$targetRatio = $Width / $Height
	if ($sourceRatio -gt $targetRatio) {
		$sourceHeight = $image.Height
		$sourceWidth = [int]($sourceHeight * $targetRatio)
		$sourceX = [int](($image.Width - $sourceWidth) / 2)
		$sourceY = 0
	} else {
		$sourceWidth = $image.Width
		$sourceHeight = [int]($sourceWidth / $targetRatio)
		$sourceX = 0
		$sourceY = [int](($image.Height - $sourceHeight) / 2)
	}
	$destination = [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height)
	$source = [System.Drawing.Rectangle]::new($sourceX, $sourceY, $sourceWidth, $sourceHeight)
	$Graphics.DrawImage($image, $destination, $source, [System.Drawing.GraphicsUnit]::Pixel)
	$image.Dispose()
}

function Draw-Frame {
	param($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height)
	$shadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(92, 0, 0, 0))
	Fill-RoundedRectangle $Graphics $shadow ($X + 10) ($Y + 14) $Width $Height 20
	$shadow.Dispose()
	$panel = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 29, 29, 38))
	Fill-RoundedRectangle $Graphics $panel $X $Y $Width $Height 20
	$panel.Dispose()
	$border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(135, 139, 92, 246), 2)
	Draw-RoundedRectangle $Graphics $border $X $Y $Width $Height 20
	$border.Dispose()
}

function Draw-Header {
	param($Graphics, [string]$Title, [string]$Subtitle)
	Draw-Text $Graphics 'CanvasPort' 48 34 24 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.Color]::FromArgb(167, 139, 250))
	Draw-Text $Graphics $Title 48 70 44 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.Color]::White)
	Draw-Text $Graphics $Subtitle 50 126 20 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(190, 194, 210))
}

function Draw-Badge {
	param($Graphics, [string]$Text, [float]$X, [float]$Y, [float]$Width)
	$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 42, 35, 66))
	Fill-RoundedRectangle $Graphics $brush $X $Y $Width 34 17
	$brush.Dispose()
	$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(145, 139, 92, 246), 1)
	Draw-RoundedRectangle $Graphics $pen $X $Y $Width 34 17
	$pen.Dispose()
	Draw-Text $Graphics $Text ($X + 14) ($Y + 6) 15 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.Color]::FromArgb(229, 221, 255))
}

function Save-Canvas {
	param($Canvas, [string]$FileName)
	$path = Join-Path $outputDirectory $FileName
	$Canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
	$Canvas.Graphics.Dispose()
	$Canvas.Bitmap.Dispose()
	Write-Output $path
}

$sourceTypography = Join-Path $projectRoot 'imgs\obsidian_test_01.png'
$exportTypography = Join-Path $projectRoot 'imgs\exported_pdf_test_01.png'
$exportEmbedded = Join-Path $projectRoot 'imgs\exported_pdf_test_03.png'
$exportGroups = Join-Path $projectRoot 'imgs\exported_pdf_test_04.png'

$canvas = New-Canvas
Draw-Header $canvas.Graphics 'Canvas in. Portable formats out.' 'One local workflow for web, image, document, and diagram exports.'
Draw-Frame $canvas.Graphics 48 188 1104 530
Draw-CoverImage $canvas.Graphics $exportTypography 62 202 1076 502
Draw-Badge $canvas.Graphics 'HTML' 48 742 76
Draw-Badge $canvas.Graphics 'PNG' 134 742 72
Draw-Badge $canvas.Graphics 'JPEG' 216 742 78
Draw-Badge $canvas.Graphics 'WebP' 304 742 82
Draw-Badge $canvas.Graphics 'SVG' 396 742 70
Draw-Badge $canvas.Graphics 'PDF' 476 742 68
Draw-Badge $canvas.Graphics 'Excalidraw' 554 742 112
Draw-Badge $canvas.Graphics 'Mermaid' 676 742 100
Draw-Badge $canvas.Graphics 'D2' 786 742 58
Save-Canvas $canvas '01-portable-formats.png'

$canvas = New-Canvas
Draw-Header $canvas.Graphics 'Obsidian Canvas, faithfully exported' 'Compare the source with the generated PDF: layout, type, colors, labels, and edges stay aligned.'
Draw-Frame $canvas.Graphics 48 188 540 548
Draw-Frame $canvas.Graphics 612 188 540 548
Draw-Badge $canvas.Graphics 'SOURCE CANVAS' 72 208 148
Draw-Badge $canvas.Graphics 'CANVASPORT PDF' 636 208 158
Draw-CoverImage $canvas.Graphics $sourceTypography 62 258 512 464
Draw-CoverImage $canvas.Graphics $exportTypography 626 258 512 464
Save-Canvas $canvas '02-faithful-export.png'

$canvas = New-Canvas
Draw-Header $canvas.Graphics 'Embedded content stays useful' 'Preserve images, SVG, Markdown, code, data, links, and the first page of embedded PDFs.'
Draw-Frame $canvas.Graphics 48 188 1104 548
Draw-ContainedImage $canvas.Graphics $exportEmbedded 62 202 1076 520
Save-Canvas $canvas '03-embedded-content.png'

$canvas = New-Canvas
Draw-Header $canvas.Graphics 'Complex layouts keep their structure' 'Groups, nested regions, cover images, repeated backgrounds, transparency, labels, and overlaps.'
Draw-Frame $canvas.Graphics 48 188 1104 548
Draw-ContainedImage $canvas.Graphics $exportGroups 62 202 1076 520
Save-Canvas $canvas '04-complex-layouts.png'

$canvas = New-Canvas
Draw-Header $canvas.Graphics 'Private by design. Flexible by default.' 'Export several formats at once, choose a theme, and keep every file inside your vault.'
Draw-Frame $canvas.Graphics 48 188 1104 548
Draw-CoverImage $canvas.Graphics $exportTypography 568 212 556 500
Draw-Text $canvas.Graphics 'Local-first' 84 238 34 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.Color]::White)
Draw-Text $canvas.Graphics 'No accounts, telemetry, ads,' 86 290 21 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(200, 204, 218))
Draw-Text $canvas.Graphics 'or external API calls.' 86 320 21 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(200, 204, 218))
Draw-Text $canvas.Graphics 'Your export, your way' 84 386 34 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.Color]::White)
Draw-Text $canvas.Graphics 'Light, dark, or matched theme' 86 438 20 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(200, 204, 218))
Draw-Text $canvas.Graphics 'Grid and transparency controls' 86 472 20 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(200, 204, 218))
Draw-Text $canvas.Graphics 'Scale and quality settings' 86 506 20 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(200, 204, 218))
Draw-Text $canvas.Graphics 'Safe overwrite, rename, or skip' 86 540 20 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.Color]::FromArgb(200, 204, 218))
Draw-Badge $canvas.Graphics 'DESKTOP' 84 620 100
Draw-Badge $canvas.Graphics 'OFFLINE' 194 620 94
Draw-Badge $canvas.Graphics 'OPEN SOURCE' 298 620 132
Save-Canvas $canvas '05-local-workflow.png'

