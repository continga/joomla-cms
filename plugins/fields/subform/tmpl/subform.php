<?php
/**
 * @package     Joomla.Plugin
 * @subpackage  Fields.Subform
 *
 * @copyright   Copyright (C) 2005 - 2017 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */
defined('_JEXEC') or die;

echo '<ul>';
foreach ($field->value as $row)
{
	echo '<li>';
	echo implode(' ', (array)$row);
	echo '</li>';
}
echo '</ul>';
