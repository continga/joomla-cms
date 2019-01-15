<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  com_fields
 *
 * @copyright   Copyright (C) 2005 - 2017 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */
defined('_JEXEC') or die;

JFormHelper::loadFieldClass('list');

/**
 * Fields Subfieldstype. Represents a list field with the options being all possible
 * custom field types, except the 'subfields' custom field type.
 *
 * @see    \JFormFieldType
 * @since  __DEPLOY_VERSION__
 */
class JFormFieldSubfieldstype extends JFormFieldList
{
	public $type = 'Subfieldstype';

	/**
	 * Configuration option for this field type to could filter the displayed custom field instances
	 * by a given context. Default value empty string. If given empty string, displays all custom fields.
	 *
	 * @var string
	 *
	 * @since __DEPLOY_VERSION__
	 */
	protected $context = '';

	/**
	 * Array to do a fast in-memory caching of all custom field items. Used to not bother the
	 * FieldsHelper with a call every time this field is being rendered.
	 *
	 * @var array
	 *
	 * @since __DEPLOY_VERSION__
	 */
	protected static $customFieldsCache = array();

	/**
	 * Method to get the field options.
	 *
	 * @return  array  The field option objects.
	 *
	 * @since __DEPLOY_VERSION__
	 */
	protected function getOptions()
	{
		$options = parent::getOptions();

		// Check whether we have a result for this context yet
		if (!isset(static::$customFieldsCache[$this->context]))
		{
			static::$customFieldsCache[$this->context] = FieldsHelper::getFields($this->context);
		}

		// Iterate over the custom fields for this context
		foreach (static::$customFieldsCache[$this->context] as $customField)
		{
			// Skip our own subfields type. We won't have subfields in subfields.
			if ($customField->type == 'subfields')
			{
				continue;
			}

			$options[] = JHtml::_('select.option', $customField->id, ($customField->title . ' (' . $customField->name . ')'));
		}

		// Sorting the fields based on the text which is displayed
		usort(
			$options,
			function ($a, $b)
			{
				return strcmp($a->text, $b->text);
			}
		);

		return $options;
	}

	/**
	 * Method to attach a JForm object to the field.
	 *
	 * @param   SimpleXMLElement  $element  The SimpleXMLElement object representing the `<field>` tag for the form field object.
	 * @param   mixed             $value    The form field value to validate.
	 * @param   string            $group    The field name group control value. This acts as an array container for the field.
	 *                                      For example if the field has name="foo" and the group value is set to "bar" then the
	 *                                      full field name would end up being "bar[foo]".
	 *
	 * @return  boolean  True on success.
	 *
	 * @see     JFormField::setup()
	 * @since   __DEPLOY_VERSION_
	 */
	public function setup(SimpleXMLElement $element, $value, $group = null)
	{
		$return = parent::setup($element, $value, $group);

		if ($return)
		{
			$this->context  = (string) $this->element['context'];
		}

		return $return;
	}
}
